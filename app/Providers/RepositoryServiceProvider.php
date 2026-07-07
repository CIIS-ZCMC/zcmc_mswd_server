<?php

namespace App\Providers;

use App\Repositories\AssessmentRepository;
use App\Repositories\AssistantTypeRepository;
use App\Repositories\CaseActivityRepository;
use App\Repositories\CaseModelRepository;
use App\Repositories\Contracts\AssessmentRepositoryInterface;
use App\Repositories\Contracts\AssistantTypeRepositoryInterface;
use App\Repositories\Contracts\CaseActivityRepositoryInterface;
use App\Repositories\Contracts\CaseModelRepositoryInterface;
use App\Repositories\Contracts\DiagnosticReportRepositoryInterface;
use App\Repositories\Contracts\DiagnosticRepositoryInterface;
use App\Repositories\Contracts\DocumentRepositoryInterface;
use App\Repositories\Contracts\GuarantorRepositoryInterface;
use App\Repositories\Contracts\InterventionRepositoryInterface;
use App\Repositories\Contracts\InterventionTypeRepositoryInterface;
use App\Repositories\Contracts\PatientAssistanceLogRepositoryInterface;
use App\Repositories\Contracts\PatientAssistanceRepositoryInterface;
use App\Repositories\Contracts\PatientAssistanceReportRepositoryInterface;
use App\Repositories\Contracts\PatientCaretakerRepositoryInterface;
use App\Repositories\Contracts\PatientFamilyMemberRepositoryInterface;
use App\Repositories\Contracts\PatientIdRepositoryInterface;
use App\Repositories\Contracts\PatientRepositoryInterface;
use App\Repositories\Contracts\PatientWatcherRepositoryInterface;
use App\Repositories\Contracts\SectorRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Repositories\DiagnosticReportRepository;
use App\Repositories\DiagnosticRepository;
use App\Repositories\DocumentRepository;
use App\Repositories\GuarantorRepository;
use App\Repositories\InterventionRepository;
use App\Repositories\InterventionTypeRepository;
use App\Repositories\PatientAssistanceLogRepository;
use App\Repositories\PatientAssistanceReportRepository;
use App\Repositories\PatientAssistanceRepository;
use App\Repositories\PatientCaretakerRepository;
use App\Repositories\PatientFamilyMemberRepository;
use App\Repositories\PatientIdRepository;
use App\Repositories\PatientRepository;
use App\Repositories\PatientWatcherRepository;
use App\Repositories\SectorRepository;
use App\Repositories\UserRepository;
use Illuminate\Support\ServiceProvider;

class RepositoryServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    public array $bindings = [
        UserRepositoryInterface::class => UserRepository::class,
        SectorRepositoryInterface::class => SectorRepository::class,
        InterventionTypeRepositoryInterface::class => InterventionTypeRepository::class,
        AssistantTypeRepositoryInterface::class => AssistantTypeRepository::class,
        GuarantorRepositoryInterface::class => GuarantorRepository::class,
        PatientRepositoryInterface::class => PatientRepository::class,
        PatientIdRepositoryInterface::class => PatientIdRepository::class,
        PatientWatcherRepositoryInterface::class => PatientWatcherRepository::class,
        PatientFamilyMemberRepositoryInterface::class => PatientFamilyMemberRepository::class,
        PatientCaretakerRepositoryInterface::class => PatientCaretakerRepository::class,
        CaseModelRepositoryInterface::class => CaseModelRepository::class,
        CaseActivityRepositoryInterface::class => CaseActivityRepository::class,
        DiagnosticRepositoryInterface::class => DiagnosticRepository::class,
        DiagnosticReportRepositoryInterface::class => DiagnosticReportRepository::class,
        AssessmentRepositoryInterface::class => AssessmentRepository::class,
        InterventionRepositoryInterface::class => InterventionRepository::class,
        DocumentRepositoryInterface::class => DocumentRepository::class,
        PatientAssistanceRepositoryInterface::class => PatientAssistanceRepository::class,
        PatientAssistanceLogRepositoryInterface::class => PatientAssistanceLogRepository::class,
        PatientAssistanceReportRepositoryInterface::class => PatientAssistanceReportRepository::class,
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }
}
