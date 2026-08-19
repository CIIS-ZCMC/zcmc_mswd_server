<?php

namespace App\Filament\Resources\Cases\RelationManagers;

use App\DTOs\DiagnosticReportDto;
use App\Models\Diagnostic;
use App\Services\DiagnosticReportService;
use Filament\Actions\Action;
use Filament\Actions\CreateAction;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Hidden;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class DiagnosticsRelationManager extends RelationManager
{
    protected static string $relationship = 'diagnostics';

    protected static ?string $title = 'Diagnostics';

    /**
     * Keep the manager editable on the case View page (Filament makes relation
     * managers read-only there by default).
     */
    public function isReadOnly(): bool
    {
        return false;
    }

    public function canCreate(): bool
    {
        return auth()->user()?->can('cases.update') ?? false;
    }

    public function canEdit(Model $record): bool
    {
        return auth()->user()?->can('cases.update') ?? false;
    }

    public function canDelete(Model $record): bool
    {
        return auth()->user()?->can('cases.update') ?? false;
    }

    private const REPORT_TYPES = [
        'lab' => 'Lab',
        'xray' => 'X-ray',
        'ct_scan' => 'CT scan',
        'medical_abstract' => 'Medical abstract',
        'others' => 'Others',
    ];

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Hidden::make('created_by')->default(fn () => auth()->id()),
            TextInput::make('diagnosis_name')->required()->columnSpanFull(),
            Textarea::make('diagnosis_description')->columnSpanFull(),
            DatePicker::make('diagnosis_date')->default(now())->required(),
            TextInput::make('attending_physician'),
            TextInput::make('facility_name'),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('diagnosis_name')->searchable(),
                TextColumn::make('diagnosis_date')->date()->sortable(),
                TextColumn::make('attending_physician')->placeholder('—'),
                TextColumn::make('reports_count')->counts('reports')->label('Reports')->badge(),
            ])
            ->defaultSort('diagnosis_date', 'desc')
            ->headerActions([
                CreateAction::make(),
            ])
            ->recordActions([
                $this->reportsAction(),
                EditAction::make(),
                DeleteAction::make(),
            ]);
    }

    /**
     * List existing report files, delete the ones removed, and upload a new one.
     */
    protected function reportsAction(): Action
    {
        return Action::make('reports')
            ->label('Reports')
            ->icon(Heroicon::OutlinedPaperClip)
            ->color('gray')
            ->visible(fn (): bool => auth()->user()?->can('cases.update') ?? false)
            ->fillForm(fn (Diagnostic $record): array => [
                'existing' => $record->reports->map(fn ($r) => [
                    'id' => $r->id, 'report_type' => $r->report_type, 'file_name' => $r->file_name, 'remarks' => $r->remarks,
                ])->all(),
            ])
            ->schema([
                Repeater::make('existing')
                    ->label('Existing reports')
                    ->schema([
                        Hidden::make('id'),
                        TextInput::make('report_type')->disabled(),
                        TextInput::make('file_name')->disabled(),
                        TextInput::make('remarks')->disabled(),
                    ])
                    ->columns(3)
                    ->addable(false)
                    ->reorderable(false)
                    ->deletable()
                    ->helperText('Remove a row to delete that report.'),
                Section::make('Add a report')->columns(2)->schema([
                    Select::make('new_report_type')->label('Report type')->options(self::REPORT_TYPES),
                    FileUpload::make('new_file')->label('File')
                        ->directory('diagnostic-reports')
                        ->storeFileNamesIn('new_file_name'),
                    Textarea::make('new_remarks')->label('Remarks')->columnSpanFull(),
                ]),
            ])
            ->action(function (Diagnostic $record, array $data) {
                $service = app(DiagnosticReportService::class);

                // Delete reports the user removed from the list.
                $keptIds = collect($data['existing'] ?? [])->pluck('id')->filter()->all();
                $record->reports()->whereNotIn('id', $keptIds)->get()->each(function ($report) use ($service) {
                    Storage::delete($report->file_path);
                    $service->delete($report);
                });

                // Create a new report if a file was uploaded (FileUpload stored
                // it and returns its path).
                $path = is_array($data['new_file'] ?? null) ? collect($data['new_file'])->first() : ($data['new_file'] ?? null);
                if (filled($path)) {
                    $service->create(DiagnosticReportDto::fromArray([
                        'diagnostic_id' => $record->id,
                        'uploaded_by' => auth()->id(),
                        'report_type' => $data['new_report_type'] ?? 'others',
                        'file_name' => $data['new_file_name'] ?? basename($path),
                        'file_path' => $path,
                        'file_type' => rescue(fn () => Storage::mimeType($path), 'application/octet-stream', false),
                        'remarks' => $data['new_remarks'] ?? null,
                    ]));
                }

                Notification::make()->title('Reports updated')->success()->send();
            });
    }
}
