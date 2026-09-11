<?php

namespace App\Repositories;

use App\Models\CaseProgressNote;
use App\Repositories\Contracts\CaseProgressNoteRepositoryInterface;

class CaseProgressNoteRepository extends BaseRepository implements CaseProgressNoteRepositoryInterface
{
    /** @var list<string> */
    protected array $searchable = ['narrative'];

    /** @var list<string> */
    protected array $filterable = ['case_id', 'author_id', 'note_type'];

    /** @var list<string> */
    protected array $sortable = ['note_date', 'follow_up_on', 'created_at'];

    protected string $defaultSort = 'note_date';

    protected string $defaultDirection = 'desc';

    /** @var list<string> */
    protected array $listWith = ['author', 'followUpDoneBy'];

    public function __construct(CaseProgressNote $model)
    {
        parent::__construct($model);
    }
}
