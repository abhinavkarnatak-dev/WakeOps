# Monitoring phase plan

Phase 3 will be taught and built in small checkpoints. We will verify each checkpoint before moving
to the next one. Having an EC2 instance does not mean WakeOps can automatically identify every
container or service on it. We must deliberately add labels that describe the host, container,
service, and environment.

## The identity we need

An alert should eventually carry enough information to answer:

- Which organization sent it?
- Which monitoring connection sent it?
- Which host is affected, such as EC2 instance `i-111`?
- Which service is affected, such as `payment-service`, when known?
- Which environment is affected, such as `production`?
- What alert fired and how severe is it?

If several services share one host and the alert only says the host CPU is high, WakeOps does not
invent a service or contact. It records the mapping problem so it can be configured explicitly. If
the alert includes a trusted service label, WakeOps uses the matching service deployment and its
contacts.

## Checkpoints

### 1. Inspect the EC2 setup

We will first record the operating system, Docker installation, running containers, Compose files,
container names, exposed ports, and how each container maps to a WakeOps application. This is a
read-only learning step. We will not install or change anything yet.

### 2. Run a small metrics example

We will expose a simple metrics endpoint from a test service and look at the raw text in a browser or
with a command. This makes Prometheus metrics understandable before introducing Prometheus itself.

### 3. Add Prometheus

We will run Prometheus, explain its configuration file, and add one scrape target. Then we will use
the Prometheus UI to confirm that data is being collected. We will label the target with the service,
environment, and host identity that WakeOps needs.

### 4. Create one alert rule

We will add one safe test alert, inspect its pending and firing states, and learn why alert rules need
a duration instead of firing on every brief spike.

### 5. Add Alertmanager

We will route the Prometheus alert to Alertmanager. We will inspect Alertmanager's payload before
WakeOps accepts it. Alertmanager, not Prometheus itself, normally sends the webhook.

### 6. Build the WakeOps Alertmanager webhook

We will create the endpoint, secret verification, payload validation, and provider adapter. The
adapter will convert Alertmanager data into the common WakeOps alert format. At first it will only
log safe normalized test output and return quickly.

### 7. Map the alert to the saved host and service

We will match the external host identifier and optional service label to the Phase 2 records. We will
test a service-specific alert, a host-only alert, and an unknown mapping. Unknown mappings will be
visible as errors and will never be guessed.

### 8. Add Grafana

Once Prometheus is understood, Grafana becomes easier. We will connect Grafana to Prometheus, build a
small dashboard, and then configure a Grafana webhook alert separately. This shows the difference
between Grafana displaying data and Grafana sending an alert.

### 9. Add CloudWatch

CloudWatch has a different delivery path. We will learn one EC2 alarm first, then send state changes
through SNS or EventBridge using least-privilege AWS permissions. Its adapter will produce the same
internal alert format as Alertmanager and Grafana.

## Rule for the phase

We will not configure Prometheus, Grafana, and CloudWatch all at once. Each checkpoint must have a
visible test result and a short explanation of the data flow before the next checkpoint starts.
