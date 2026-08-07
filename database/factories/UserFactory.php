<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'employee_id' => fake()->unique()->numberBetween(1, 999999),
            'employee_number' => fake()->unique()->numberBetween(1000000000, 2100000000),
            'employee_name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('P@$$w0rd'),
            'role' => fake()->randomElement(['admin', 'staff']),
            'is_active' => true,
            'synced_at' => now(),
        ];
    }
}
