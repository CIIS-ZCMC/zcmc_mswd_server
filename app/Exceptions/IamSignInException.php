<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * A ZCMC IAM sign-in that cannot proceed. The message is safe to show the
 * person on the login page.
 */
class IamSignInException extends RuntimeException {}
