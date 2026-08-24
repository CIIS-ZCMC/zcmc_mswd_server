<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * The list parameters a table screen sends: paging, a search term, column
 * filters, a sort, and whether to include soft-deleted rows.
 *
 * Nothing here is trusted. The caller (a repository) decides which columns are
 * searchable, filterable and sortable; this object only carries what was asked
 * for. See BaseRepository::paginateList().
 */
class ListQuery
{
    public const TRASHED_WITHOUT = 'without';

    public const TRASHED_WITH = 'with';

    public const TRASHED_ONLY = 'only';

    /**
     * @param  array<string, string>  $filters
     */
    public function __construct(
        public readonly int $page = 1,
        public readonly int $perPage = 15,
        public readonly ?string $search = null,
        public readonly ?string $sort = null,
        public readonly string $direction = 'asc',
        public readonly array $filters = [],
        public readonly string $trashed = self::TRASHED_WITHOUT,
    ) {}

    public static function fromRequest(Request $request): self
    {
        $filters = $request->query('filter', []);

        return new self(
            page: max(1, (int) $request->query('page', 1)),
            // Cap per_page so a client cannot ask for the whole table at once.
            perPage: min(100, max(1, (int) $request->query('per_page', 15))),
            search: self::trimmedOrNull($request->query('search')),
            sort: self::trimmedOrNull($request->query('sort')),
            direction: strtolower((string) $request->query('direction')) === 'desc' ? 'desc' : 'asc',
            filters: is_array($filters) ? array_filter($filters, fn ($value) => $value !== null && $value !== '') : [],
            trashed: in_array($request->query('trashed'), [self::TRASHED_WITH, self::TRASHED_ONLY], true)
                ? $request->query('trashed')
                : self::TRASHED_WITHOUT,
        );
    }

    private static function trimmedOrNull(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
