###############################################################################
# Stage 1: Install PHP dependencies (no-dev, optimized)
###############################################################################
FROM composer:2 AS composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-interaction --no-dev --prefer-dist --no-autoloader --no-scripts --ignore-platform-reqs

###############################################################################
# Stage 2: Build frontend assets (including SSR)
###############################################################################
FROM php:8.5-cli-alpine AS assets

RUN apk add --no-cache nodejs npm

WORKDIR /var/www/html

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
COPY --from=composer /var/www/html/vendor ./vendor
COPY --from=composer /usr/bin/composer /usr/bin/composer
RUN mkdir -p storage/framework/views storage/framework/cache storage/framework/sessions bootstrap/cache
RUN cp .env.example .env
RUN composer dump-autoload --no-dev --no-scripts
RUN php artisan package:discover --ansi
RUN npm run build
RUN npm prune --omit=dev

###############################################################################
# Stage 3: Final production image — FrankenPHP + Octane + Caddy + Node SSR
###############################################################################
FROM dunglas/frankenphp:1-php8.5 AS production

# Install Node.js 20 and supervisord
RUN apt-get update && apt-get install -y --no-install-recommends curl supervisor \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN install-php-extensions \
    pdo_mysql \
    gd \
    zip \
    pcntl \
    bcmath \
    opcache \
    intl

# Production opcache config
RUN { \
    echo "opcache.enable=1"; \
    echo "opcache.memory_consumption=256"; \
    echo "opcache.max_accelerated_files=20000"; \
    echo "opcache.validate_timestamps=0"; \
} > /usr/local/etc/php/conf.d/opcache.ini

WORKDIR /app

# Copy application code
COPY --chown=www-data:www-data . .

# Copy vendor from composer stage
COPY --chown=www-data:www-data --from=composer /var/www/html/vendor ./vendor

# Copy production node_modules from assets stage
COPY --chown=www-data:www-data --from=assets /var/www/html/node_modules ./node_modules

# Copy built assets from assets stage
COPY --chown=www-data:www-data --from=assets /var/www/html/public/build ./public/build

# Copy SSR bundle from assets stage
COPY --chown=www-data:www-data --from=assets /var/www/html/bootstrap/ssr ./bootstrap/ssr

# Regenerate optimized autoloader now that app code is present
COPY --from=composer /usr/bin/composer /usr/bin/composer
RUN composer dump-autoload --no-dev --optimize --no-scripts

# Ensure storage and bootstrap/cache are writable
RUN mkdir -p storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

# Supervisord — manages Octane/FrankenPHP (HTTP :80) and Node SSR (:13714) in one container
RUN <<'SUPERVISORD'
cat > /etc/supervisor/conf.d/app.conf <<'CONF'
[program:octane]
command=php artisan octane:start --server=frankenphp --caddyfile=/app/docker/Caddyfile --host=0.0.0.0 --port=80 --admin-port=2019 --workers=auto --max-requests=500
directory=/app
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:ssr]
command=node bootstrap/ssr/ssr.js
directory=/app
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
CONF
SUPERVISORD

# Entrypoint: bootstrap Laravel caches then hand off to supervisord
RUN <<'ENTRYPOINT'
cat > /usr/local/bin/entrypoint.sh <<'SCRIPT'
#!/bin/bash
set -e

# Always build .env from example, then stamp in values from container environment.
# This ensures config:cache picks up the correct secrets regardless of .env.example defaults.
cp .env.example .env
php -r '
$lines = file(".env", FILE_IGNORE_NEW_LINES);
$format = function ($val) {
    if (preg_match("/[\s#\"\x27]/", $val) || str_contains($val, "\n") || str_contains($val, "\r")) {
        return "\"" . str_replace(["\\", "\"", "\n", "\r"], ["\\\\", "\\\"", "\\n", "\\r"], $val) . "\"";
    }
    return $val;
};
$seen = [];
$result = [];
foreach ($lines as $line) {
    $trimmed = trim($line);
    if ($trimmed === "" || str_starts_with($trimmed, "#")) {
        $result[] = $line;
        continue;
    }
    if (preg_match("/^([A-Za-z0-9_]+)=(.*)$/", $line, $matches)) {
        $key = $matches[1];
        $val = getenv($key);
        if ($val !== false) {
            $result[] = $key . "=" . $format($val);
        } else {
            $result[] = $line;
        }
        $seen[$key] = true;
    } else {
        $result[] = $line;
    }
}
$alwaysCheck = [
    "APP_NAME","APP_ENV","APP_KEY","APP_DEBUG","APP_URL","SANCTUM_STATEFUL_DOMAINS",
    "DB_CONNECTION","DB_HOST","DB_PORT","DB_DATABASE","DB_USERNAME","DB_PASSWORD",
    "SQLSRV_HOST","SQLSRV_PORT","SQLSRV_DATABASE","SQLSRV_USERNAME","SQLSRV_PASSWORD",
    "REDIS_CLIENT","REDIS_HOST","REDIS_PORT","REDIS_PASSWORD",
    "CACHE_STORE","QUEUE_CONNECTION","SESSION_DRIVER","BROADCAST_CONNECTION",
    "FILESYSTEM_DISK","OCTANE_SERVER","INERTIA_SSR_ENABLED",
];
foreach ($alwaysCheck as $key) {
    if (!isset($seen[$key])) {
        $val = getenv($key);
        if ($val !== false) {
            $result[] = $key . "=" . $format($val);
        }
    }
}
file_put_contents(".env", implode(PHP_EOL, $result) . PHP_EOL);
'

php artisan package:discover --ansi
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
php artisan migrate --force --isolated

if [ $# -gt 0 ]; then
    exec "$@"
fi

exec supervisord -n -c /etc/supervisor/supervisord.conf
SCRIPT
chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
