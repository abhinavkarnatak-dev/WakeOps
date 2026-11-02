import { database } from '@wakeops/database';
import { maskPhoneNumber } from '@wakeops/shared';
import type { ReactNode } from 'react';
import { fieldClass, PageHeader } from '@/components/dashboard-ui';
import { requireOrganization } from '@/lib/organization';
import { SetupForm } from './setup-form';
import { ContactFields } from './contact-fields';
import { SavedRecord } from './saved-record';

function StepTitle({
  step,
  title,
  hint,
  done,
}: {
  step: number;
  title: string;
  hint: string;
  done: boolean;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full font-mono text-sm transition-colors ${
          done ? 'bg-signal text-black' : 'border border-white/15 text-zinc-400'
        }`}
      >
        {done ? (
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            className="size-4"
            aria-label="Done"
          >
            <path d="m3.5 8.5 3 3 6-6.5" />
          </svg>
        ) : (
          step
        )}
      </span>
      <div>
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-white">{title}</h2>
        <p className="mt-0.5 text-sm text-zinc-500">{hint}</p>
      </div>
    </div>
  );
}

const card = 'rounded-[24px] border border-white/[0.07] bg-white/[0.015] p-6';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  optional = false,
}: {
  label: string;
  name: string;
  options: { id: string; name: string }[];
  optional?: boolean;
}) {
  return (
    <Field label={label}>
      <select name={name} className={fieldClass} required={!optional} defaultValue="">
        <option value="">{optional ? 'None' : 'Select an option'}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

export default async function SetupPage() {
  const membership = await requireOrganization();
  const organizationId = membership.organizationId;
  const [engineers, applications, environments, resources] = await Promise.all([
    database.engineer.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, phoneNumber: true, phoneCountry: true },
    }),
    database.application.findMany({ where: { organizationId }, orderBy: { name: 'asc' } }),
    database.environment.findMany({ where: { organizationId }, orderBy: { name: 'asc' } }),
    database.monitoredResource.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      include: {
        mappings: {
          orderBy: { createdAt: 'asc' },
          include: {
            application: true,
            environment: true,
            assignment: { include: { primaryEngineer: true, secondaryEngineer: true } },
          },
        },
      },
    }),
  ]);
  const admin = membership.role === 'ADMIN';
  const canCreateHost = admin;
  const canDeploy =
    admin &&
    resources.length > 0 &&
    engineers.length > 0 &&
    applications.length > 0 &&
    environments.length > 0;
  return (
    <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
      <PageHeader
        kicker="Organization"
        title="Who gets the call"
        description="Add engineers and services, then attach each service to the host Grafana reports on. That mapping decides who WakeOps calls."
      />
      {!admin && (
        <p className="mt-6 rounded-2xl border border-ring/20 bg-ring/[0.06] px-4 py-3 text-sm text-ring">
          Only admins can change this setup.
        </p>
      )}
      <section className="mt-10 grid gap-5 lg:grid-cols-3">
        <div className={card}>
          <StepTitle
            step={1}
            title="Engineers"
            hint="People WakeOps can call"
            done={engineers.length > 0}
          />
          <SetupForm kind="engineer" disabled={!admin}>
            <ContactFields />
          </SetupForm>
          <ul className="mt-5">
            {engineers.map((engineer) => (
              <SavedRecord
                key={engineer.id}
                kind="engineer"
                recordId={engineer.id}
                editable={admin}
                value={
                  <>
                    <p className="font-semibold">{engineer.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                      <span>{engineer.email}</span>
                      <span>{maskPhoneNumber(engineer.phoneNumber)}</span>
                    </div>
                  </>
                }
                editFields={<ContactFields engineer={engineer} />}
              />
            ))}
          </ul>
          <p className="mt-4 text-sm text-zinc-500">
            Contacts can receive calls without a WakeOps account.
          </p>
        </div>
        <div className={card}>
          <StepTitle
            step={2}
            title="Services"
            hint="What your alerts are about"
            done={applications.length > 0}
          />
          <SetupForm kind="application" disabled={!admin}>
            <Field label="Service name">
              <input
                name="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="payment-service"
                className={fieldClass}
              />
            </Field>
          </SetupForm>
          <ul className="mt-5">
            {applications.map((app) => (
              <SavedRecord
                key={app.id}
                kind="application"
                recordId={app.id}
                editable={admin}
                value={<p className="pt-1 font-medium">{app.name}</p>}
                editFields={
                  <Field label="Service name">
                    <input
                      name="name"
                      required
                      minLength={2}
                      maxLength={80}
                      defaultValue={app.name}
                      className={fieldClass}
                    />
                  </Field>
                }
              />
            ))}
          </ul>
        </div>
        <div className={card}>
          <StepTitle
            step={3}
            title="Environments"
            hint="Production, staging and so on"
            done={environments.length > 0}
          />
          <SetupForm kind="environment" disabled={!admin}>
            <Field label="Environment name">
              <input
                name="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="production"
                className={fieldClass}
              />
            </Field>
          </SetupForm>
          <ul className="mt-5">
            {environments.map((env) => (
              <SavedRecord
                key={env.id}
                kind="environment"
                recordId={env.id}
                editable={admin}
                value={<p className="pt-1 font-medium">{env.name}</p>}
                editFields={
                  <Field label="Environment name">
                    <input
                      name="name"
                      required
                      minLength={2}
                      maxLength={80}
                      defaultValue={env.name}
                      className={fieldClass}
                    />
                  </Field>
                }
              />
            ))}
          </ul>
        </div>
      </section>
      <section className={`mt-5 ${card}`}>
        <StepTitle
          step={4}
          title="Hosts"
          hint="Machines Grafana reports on"
          done={resources.length > 0}
        />
        <SetupForm kind="host" disabled={!canCreateHost}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Host name">
              <input
                name="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="Payments EC2"
                className={fieldClass}
              />
            </Field>
            <Field label="External resource identifier">
              <input
                name="externalIdentifier"
                required
                maxLength={200}
                placeholder="i-111 or 10.0.0.5:3000"
                className={fieldClass}
              />
            </Field>
          </div>
        </SetupForm>
        <p className="mt-4 text-sm text-zinc-500">
          A host can be an EC2 instance, virtual machine, or server. Use the exact identifier its
          monitoring alerts will send. Contacts are assigned when you attach a service below.
        </p>
      </section>
      <section className={`mt-5 ${card}`}>
        <StepTitle
          step={5}
          title="Attach a service to a host"
          hint="This is the mapping that picks who gets called"
          done={resources.some((resource) => resource.mappings.length > 0)}
        />
        {!canDeploy && (
          <p className="mb-5 text-sm text-ring">
            Add a host, engineer, service and environment first.
          </p>
        )}
        <SetupForm kind="deployment" disabled={!canDeploy}>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField label="Host" name="resourceId" options={resources} />
            <SelectField label="Application" name="applicationId" options={applications} />
            <SelectField label="Environment" name="environmentId" options={environments} />
            <SelectField label="On-call engineer" name="primaryEngineerId" options={engineers} />
            <SelectField
              label="Senior engineer (optional)"
              name="secondaryEngineerId"
              options={engineers}
              optional
            />
          </div>
        </SetupForm>
        <p className="mt-4 text-sm text-zinc-500">
          Add one entry for every service running on the host. The service contacts are used when an
          alert identifies that service.
        </p>
      </section>
      <section className="mt-14">
        <h2 className="mb-5 text-xl font-semibold tracking-[-0.02em] text-white">
          Hosts and their services
        </h2>
        {!resources.length ? (
          <p className="rounded-[24px] border border-dashed border-white/10 px-6 py-12 text-center text-sm text-zinc-500">
            No hosts yet. Add one above, then attach the services that run on it.
          </p>
        ) : (
          <div className="space-y-5">
            {resources.map((resource) => (
              <article key={resource.id} className={card}>
                <ul>
                  <SavedRecord
                    kind="host"
                    recordId={resource.id}
                    editable={admin}
                    value={
                      <>
                        <p className="text-lg font-semibold">{resource.name}</p>
                        <p className="mt-1 text-zinc-500">
                          Grafana identifier: {resource.externalIdentifier}
                        </p>
                      </>
                    }
                    editFields={
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Host name">
                          <input
                            name="name"
                            required
                            minLength={2}
                            maxLength={80}
                            defaultValue={resource.name}
                            className={fieldClass}
                          />
                        </Field>
                        <Field label="External resource identifier">
                          <input
                            name="externalIdentifier"
                            required
                            maxLength={200}
                            defaultValue={resource.externalIdentifier}
                            className={fieldClass}
                          />
                        </Field>
                      </div>
                    }
                  />
                </ul>
                <div className="mt-4 border-t border-white/8 pt-4">
                  <h3 className="text-sm text-zinc-400">Services on this host</h3>
                  {!resource.mappings.length ? (
                    <p className="mt-2 text-sm text-zinc-500">No services attached yet.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-white/6">
                      {resource.mappings.map((mapping) => (
                        <li
                          key={mapping.id}
                          className="flex items-start justify-between gap-4 py-3 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2 font-medium text-white">
                              {mapping.application.name}
                              <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs font-normal text-zinc-400">
                                {mapping.environment.name}
                              </span>
                            </p>
                            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                              <span>
                                <span className="text-signal">On call</span>{' '}
                                {mapping.assignment?.primaryEngineer.name ?? 'Unassigned'}
                              </span>
                              <span>
                                <span className="text-zinc-300">Senior</span>{' '}
                                {mapping.assignment?.secondaryEngineer?.name ?? 'Unassigned'}
                              </span>
                            </p>
                          </div>
                          {admin && (
                            <SetupForm
                              kind="deployment"
                              operation="delete"
                              recordId={mapping.id}
                              compact
                            >
                              {null}
                            </SetupForm>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
