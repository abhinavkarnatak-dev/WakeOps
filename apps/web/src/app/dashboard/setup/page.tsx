import { database } from '@wakeops/database';
import { maskPhoneNumber } from '@wakeops/shared';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireOrganization } from '@/lib/organization';
import { SetupForm } from './setup-form';
import { ContactFields } from './contact-fields';
import { SavedRecord } from './saved-record';

const fieldClass = 'w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm">{label}</span>
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
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link href="/dashboard" className="text-sm text-cyan-300">
        Back to dashboard
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Organization setup</h1>
      <p className="mt-2 text-slate-300">
        Add contacts and services, then tell WakeOps who owns each monitored resource.
      </p>
      {!admin && <p className="mt-4 text-amber-300">Only admins can change this setup.</p>}
      <section className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-slate-700 p-5">
          <h2 className="mb-4 text-xl font-semibold">1. Engineers</h2>
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
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                      <span>{engineer.email}</span>
                      <span>{maskPhoneNumber(engineer.phoneNumber)}</span>
                    </div>
                  </>
                }
                editFields={<ContactFields engineer={engineer} />}
              />
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-400">
            Contacts can receive calls without a WakeOps account.
          </p>
        </div>
        <div className="rounded-xl border border-slate-700 p-5">
          <h2 className="mb-4 text-xl font-semibold">2. Applications</h2>
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
        <div className="rounded-xl border border-slate-700 p-5">
          <h2 className="mb-4 text-xl font-semibold">3. Environments</h2>
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
      <section className="mt-6 rounded-xl border border-slate-700 p-5">
        <h2 className="mb-4 text-xl font-semibold">4. Add a host</h2>
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
        <p className="mt-4 text-sm text-slate-400">
          A host can be an EC2 instance, virtual machine, or server. Use the exact identifier its
          monitoring alerts will send. Contacts are assigned when you attach a service below.
        </p>
      </section>
      <section className="mt-6 rounded-xl border border-slate-700 p-5">
        <h2 className="mb-4 text-xl font-semibold">5. Attach a service to a host</h2>
        {!canDeploy && (
          <p className="mb-4 text-sm text-amber-300">
            Add a host, engineer, application and environment first.
          </p>
        )}
        <SetupForm kind="deployment" disabled={!canDeploy}>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField label="Host" name="resourceId" options={resources} />
            <SelectField label="Application" name="applicationId" options={applications} />
            <SelectField label="Environment" name="environmentId" options={environments} />
            <SelectField label="Primary engineer" name="primaryEngineerId" options={engineers} />
            <SelectField
              label="Secondary engineer (optional)"
              name="secondaryEngineerId"
              options={engineers}
              optional
            />
          </div>
        </SetupForm>
        <p className="mt-4 text-sm text-slate-400">
          Add one entry for every service running on the host. The service contacts are used when an
          alert identifies that service.
        </p>
      </section>
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Hosts and deployed services</h2>
        {!resources.length ? (
          <p className="text-slate-400">No hosts added yet.</p>
        ) : (
          <div className="space-y-5">
            {resources.map((resource) => (
              <article
                key={resource.id}
                className="rounded-xl border border-slate-700 bg-slate-900/40 p-5"
              >
                <ul>
                  <SavedRecord
                    kind="host"
                    recordId={resource.id}
                    editable={admin}
                    value={
                      <>
                        <p className="text-lg font-semibold">{resource.name}</p>
                        <p className="mt-1 text-slate-400">
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
                <div className="mt-4 border-t border-slate-800 pt-4">
                  <h3 className="font-medium">Services on this host</h3>
                  {!resource.mappings.length ? (
                    <p className="mt-2 text-sm text-slate-400">No services attached yet.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-slate-800">
                      {resource.mappings.map((mapping) => (
                        <li
                          key={mapping.id}
                          className="flex items-start justify-between gap-4 py-3 text-sm"
                        >
                          <div>
                            <p className="font-medium">
                              {mapping.application.name} - {mapping.environment.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {mapping.assignment?.primaryEngineer.name ?? 'Unassigned'} /{' '}
                              {mapping.assignment?.secondaryEngineer?.name ?? 'No secondary'}
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
    </main>
  );
}
