<?php

namespace App\Support;

/**
 * Checkbox vocabularies of the Socio-Economic module's living conditions.
 *
 * The values match ANNEX B section III so a worker sees the same choices everywhere,
 * but they are declared here rather than borrowed from the intake model: the module has
 * no dependency on cases or the UIS (docs/PATIENT_SOCIOECONOMIC_PLAN.md).
 */
final class SocioeconomicVocabulary
{
    public const HOUSE_TENURES = ['owned', 'rented'];

    public const LIGHT_SOURCES = ['electricity', 'kerosene', 'candle'];

    public const WATER_SOURCES = ['owned', 'public', 'artesian_well'];
}
