<?php

namespace App\Support;

/**
 * Maps a case's free-form expense lines (`assessment_expenses.expense_type`) onto
 * the fixed slots of ANNEX B section III.
 *
 * The one place this matching lives: the printed form (UnifiedIntakeSheetPdfService's
 * Blade) and the patient UIS endpoint both call it, so the in-page sheet and the PDF
 * cannot disagree. A slot sums every line that matches one of its keywords (a worker
 * may enter several "Food" or "Others" lines) and is null when nothing matches. A line
 * labelled "Others: ..." belongs to the Others slot only, even when its detail text
 * names another category.
 */
class UisExpenseSlots
{
    /**
     * Slot => lower-case keywords matched with str_contains against the line label.
     * House rent, light and water have no slot: their amounts are not shown on the UIS
     * (the sheet only records the tenure and the light and water sources).
     *
     * @var array<string, list<string>>
     */
    public const KEYWORDS = [
        'food' => ['food', 'pagkain'],
        'education' => ['educ', 'edukasyon', 'school', 'tuition'],
        'transport' => ['transport', 'pamasahe', 'fare'],
        'clothing' => ['cloth', 'kasuot'],
        'medical' => ['medic', 'medik', 'medicine'],
        'house_help' => ['house help', 'househelp', 'kasambahay', 'helper'],
        'insurance' => ['insurance', 'premium'],
        'others' => ['other', 'iba'],
    ];

    /**
     * @param  iterable<object{expense_type: ?string, amount: mixed}>  $expenses
     * @return array<string, float|null>
     */
    public static function slots(iterable $expenses): array
    {
        $slots = array_fill_keys(array_keys(self::KEYWORDS), null);

        foreach (self::KEYWORDS as $slot => $keywords) {
            foreach ($expenses as $expense) {
                $type = strtolower((string) $expense->expense_type);

                if ($slot !== 'others' && str_starts_with($type, 'other')) {
                    continue;
                }

                foreach ($keywords as $keyword) {
                    if (str_contains($type, $keyword)) {
                        $slots[$slot] = ($slots[$slot] ?? 0.0) + (float) $expense->amount;

                        break;
                    }
                }
            }

            if ($slots[$slot] !== null) {
                $slots[$slot] = round($slots[$slot], 2);
            }
        }

        return $slots;
    }
}
