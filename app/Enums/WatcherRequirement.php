<?php

namespace App\Enums;

enum WatcherRequirement: string
{
    case Required = 'required';
    case Recommended = 'recommended';
    case Optional = 'optional';
    case Waived = 'waived';
}
