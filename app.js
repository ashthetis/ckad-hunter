/* ===================== CONFIG ===================== */

const STORAGE_KEY = "ckadHunterData_v2";

const STATS = {
  config:        { name: "Config & Security",     color: "#ff4d6d" },
  design:        { name: "Design & Build",         color: "#5b7fff" },
  deployment:    { name: "Deployment",             color: "#7c5cff" },
  networking:    { name: "Services & Networking",  color: "#3ddc97" },
  observability: { name: "Observability",          color: "#ffb84d" },
};

// Each quest carries its own real exercise prompts + solutions, so the site
// is self-contained and doesn't depend on any external repo being present.
const DEFAULT_QUESTS = [
  { id: "q1", week: "Week 1", title: "Setup kind cluster + aliases. Domain 4 intro: Config, Secrets, ServiceAccounts.", stat: "config", xp: 75,
    tasks: [
      { prompt: "Create a ConfigMap `app-cm` with LOG_LEVEL=debug and MAX_CONNS=100. Create a Pod `configured-app` (image busybox, command `sh -c \"env; sleep 3600\"`) that loads ALL keys from `app-cm` as environment variables.",
        solution: "kubectl create configmap app-cm --from-literal=LOG_LEVEL=debug --from-literal=MAX_CONNS=100\n\napiVersion: v1\nkind: Pod\nmetadata:\n  name: configured-app\nspec:\n  containers:\n  - name: app\n    image: busybox\n    command: [\"sh\", \"-c\", \"env; sleep 3600\"]\n    envFrom:\n    - configMapRef:\n        name: app-cm" },
      { prompt: "Create a second Pod `configured-app-2` that mounts `app-cm` as a volume at /etc/config instead, so each key becomes a file.",
        solution: "volumes:\n- name: config-vol\n  configMap:\n    name: app-cm\n# in the container:\nvolumeMounts:\n- name: config-vol\n  mountPath: /etc/config" },
    ] },
  { id: "q2", week: "Week 1", title: "Drill: Secrets, ConfigMaps, resource requests/limits, quotas.", stat: "config", xp: 100,
    tasks: [
      { prompt: "Create a Secret `db-secret` with username=admin and password=S3cr3t!. Mount it as a volume at /etc/secret in Pod `db-client` (image busybox, sleep 3600), with file permissions 0400.",
        solution: "kubectl create secret generic db-secret --from-literal=username=admin --from-literal=password='S3cr3t!'\n\nvolumes:\n- name: secret-vol\n  secret:\n    secretName: db-secret\n    defaultMode: 0400" },
      { prompt: "Create a Pod `limited` (image nginx) with requests cpu=100m/memory=128Mi and limits cpu=250m/memory=256Mi. Then create a ResourceQuota `ns-quota` in the same namespace capping total CPU requests at 1 and total memory requests at 1Gi.",
        solution: "resources:\n  requests: {cpu: 100m, memory: 128Mi}\n  limits: {cpu: 250m, memory: 256Mi}\n\napiVersion: v1\nkind: ResourceQuota\nmetadata: {name: ns-quota}\nspec:\n  hard:\n    requests.cpu: \"1\"\n    requests.memory: 1Gi" },
    ] },
  { id: "q3", week: "Week 1", title: "Drill: SecurityContexts, ServiceAccounts, RBAC basics, CRDs/Operators.", stat: "config", xp: 100,
    tasks: [
      { prompt: "Create Pod `secure-pod` (image busybox, sleep 3600) that runs as UID 1000, is not allowed to run as root, has a read-only root filesystem, and drops the NET_RAW capability.",
        solution: "spec:\n  securityContext:\n    runAsUser: 1000\n    runAsNonRoot: true\n  containers:\n  - name: app\n    securityContext:\n      readOnlyRootFilesystem: true\n      capabilities:\n        drop: [\"NET_RAW\"]" },
      { prompt: "Create ServiceAccount `pod-reader-sa`. Create a Role `pod-reader` that can get/list/watch pods. Bind them with a RoleBinding. Assign the ServiceAccount to a new Pod `sa-test`.",
        solution: "kubectl create serviceaccount pod-reader-sa\nkubectl create role pod-reader --verb=get,list,watch --resource=pods\nkubectl create rolebinding pod-reader-binding --role=pod-reader --serviceaccount=default:pod-reader-sa\n# in the pod spec: serviceAccountName: pod-reader-sa" },
    ] },
  { id: "test1", week: "Week 1", title: "WEEKLY TEST: Config & Security gauntlet.", stat: "config", xp: 140, miniboss: true,
    tasks: [
      { prompt: "Timed (15 min), no docs: build one Pod manifest from memory that (a) loads a Secret as env vars, (b) sets cpu/memory requests+limits, and (c) runs with a non-root SecurityContext that drops a capability.",
        solution: "Combine envFrom.secretRef + a resources block + securityContext (runAsNonRoot, capabilities.drop) — the pieces from this week's earlier quests. If you nailed all three without peeking, you cleared the gauntlet." },
      { prompt: "Quick recall: are Kubernetes Secrets encrypted at rest by default?",
        solution: "No — they're base64-encoded, not encrypted, unless you've configured encryption at rest on the API server (out of scope for CKAD). Treat 'stored as a Secret' as obfuscated, not secure, by default." },
    ] },
  { id: "q4", week: "Week 2", title: "Domain 1 intro: multi-container pod patterns, building images.", stat: "design", xp: 75,
    tasks: [
      { prompt: "In namespace `logging`, create Pod `app-log` with two containers: `app` (busybox, appends timestamps to /var/log/app.log every 5s) and `sidecar` (busybox, tails that same file). Share it via an emptyDir volume mounted at /var/log.",
        solution: "volumes:\n- name: log-vol\n  emptyDir: {}\ncontainers:\n- name: app\n  image: busybox\n  command: [\"sh\",\"-c\",\"while true; do echo $(date) >> /var/log/app.log; sleep 5; done\"]\n  volumeMounts: [{name: log-vol, mountPath: /var/log}]\n- name: sidecar\n  image: busybox\n  command: [\"sh\",\"-c\",\"tail -f /var/log/app.log\"]\n  volumeMounts: [{name: log-vol, mountPath: /var/log}]" },
      { prompt: "Create Pod `web` with an initContainer (busybox, `sleep 5`) that runs before the main container (nginx) starts. Verify it shows Init:0/1 briefly before Running.",
        solution: "initContainers:\n- name: init-wait\n  image: busybox\n  command: [\"sh\",\"-c\",\"sleep 5\"]\ncontainers:\n- name: nginx\n  image: nginx" },
    ] },
  { id: "q5", week: "Week 2", title: "Drill: workload types (Deployment/DaemonSet/Job/CronJob), volumes.", stat: "design", xp: 100,
    tasks: [
      { prompt: "You need a process that runs on every node for log collection. Create workload `log-agent` (busybox, sleep 3600) using the correct resource type.",
        solution: "A DaemonSet. No imperative command exists for it — generate a Deployment YAML with --dry-run=client, then hand-edit kind: DaemonSet and remove spec.replicas/spec.strategy." },
      { prompt: "Create a CronJob `cleanup` that runs every 10 minutes (busybox, `echo cleaning up`). Set successfulJobsHistoryLimit to 2.",
        solution: "kubectl create cronjob cleanup --image=busybox --schedule=\"*/10 * * * *\" --dry-run=client -o yaml -- sh -c \"echo cleaning up\" > cron.yaml\n# then add spec.successfulJobsHistoryLimit: 2" },
      { prompt: "Create PVC `data-pvc` requesting 1Gi ReadWriteOnce, mount it into Pod `data-pod` (nginx) at /usr/share/nginx/html.",
        solution: "kind: PersistentVolumeClaim\nmetadata: {name: data-pvc}\nspec:\n  accessModes: [\"ReadWriteOnce\"]\n  resources: {requests: {storage: 1Gi}}\n# pod: volumes: [{name: data, persistentVolumeClaim: {claimName: data-pvc}}]" },
    ] },
  { id: "q6", week: "Week 2", title: "Domain 2 intro: Deployments, rolling updates, rollout/rollback.", stat: "deployment", xp: 75,
    tasks: [
      { prompt: "Create Deployment `frontend` (nginx:1.24, 4 replicas). Update the image to nginx:1.25 with `kubectl set image`, watch the rollout, check `kubectl rollout history`.",
        solution: "kubectl create deployment frontend --image=nginx:1.24 --replicas=4\nkubectl set image deployment/frontend nginx=nginx:1.25\nkubectl rollout status deployment/frontend\nkubectl rollout history deployment/frontend" },
      { prompt: "Roll `frontend` back to the revision that used nginx:1.24.",
        solution: "kubectl rollout undo deployment/frontend --to-revision=1" },
    ] },
  { id: "test2", week: "Week 2", title: "WEEKLY TEST: Pod design gauntlet.", stat: "design", xp: 140, miniboss: true,
    tasks: [
      { prompt: "Timed (15 min), no docs: write a Pod with an initContainer AND a sidecar sharing an emptyDir, then say out loud which controller you'd use instead if it had to run on every node.",
        solution: "initContainers block + sidecar container + shared emptyDir volume; the 'every node' answer is a DaemonSet. If both came out clean from memory, you passed." },
      { prompt: "Quick recall: what happens to a CronJob's completed Job pods by default, and why does successfulJobsHistoryLimit matter?",
        solution: "Completed pods stick around (not auto-deleted) until the history limits or a configured TTL clean them up — left unset, they pile up. That's why capping successfulJobsHistoryLimit is worth doing on any real CronJob." },
    ] },
  { id: "q7", week: "Week 3", title: "Drill: blue/green & canary patterns, Helm basics.", stat: "deployment", xp: 100,
    tasks: [
      { prompt: "Deployment `api-v1` (label track:stable, image myapp:1.0, 3 replicas) runs behind Service `api` selecting app:api. Add Deployment `api-v2` (track:canary, myapp:2.0, 1 replica) with the same app:api label so ~25% of traffic hits the canary.",
        solution: "metadata: {labels: {app: api, track: canary}}\nspec:\n  replicas: 1\n  selector: {matchLabels: {app: api, track: canary}}\n  template: {metadata: {labels: {app: api, track: canary}}}\n# Service still only selects app:api -> load-balances across both" },
      { prompt: "Add the bitnami repo, install the nginx chart as release `web` in namespace `demo`, then upgrade it to set replicaCount=3.",
        solution: "helm repo add bitnami https://charts.bitnami.com/bitnami\nhelm repo update\nkubectl create namespace demo\nhelm install web bitnami/nginx -n demo\nhelm upgrade web bitnami/nginx -n demo --set replicaCount=3" },
    ] },
  { id: "q8", week: "Week 3", title: "Drill: Kustomize.", stat: "deployment", xp: 100,
    tasks: [
      { prompt: "You have base/deployment.yaml + base/kustomization.yaml. Create overlays/prod/kustomization.yaml referencing the base and patching replica count to 5. Apply with kubectl apply -k.",
        solution: "resources:\n- ../../base\npatches:\n- target: {kind: Deployment, name: myapp}\n  patch: |-\n    - op: replace\n      path: /spec/replicas\n      value: 5\n\nkubectl apply -k overlays/prod" },
    ] },
  { id: "q9", week: "Week 3", title: "Domain 5 intro: Services, troubleshooting service access.", stat: "networking", xp: 75,
    tasks: [
      { prompt: "Create Deployment `hello` (nginx, 3 replicas, label app:hello). Create ClusterIP Service `hello-svc` on port 80 routing to those pods.",
        solution: "kubectl create deployment hello --image=nginx --replicas=3\nkubectl expose deployment hello --port=80 --name=hello-svc" },
      { prompt: "Service `broken-svc` selects app:myapp, but the Deployment's pods are labeled app:my-app (hyphen). `kubectl get endpoints broken-svc` shows nothing. Fix it without deleting the Service.",
        solution: "kubectl patch svc broken-svc -p '{\"spec\":{\"selector\":{\"app\":\"my-app\"}}}'\nkubectl get endpoints broken-svc   # should now list pod IPs" },
    ] },
  { id: "test3", week: "Week 3", title: "WEEKLY TEST: Deployment gauntlet.", stat: "deployment", xp: 140, miniboss: true,
    tasks: [
      { prompt: "Timed (15 min), no docs: ship a rolling update to a Deployment, confirm it landed, then roll it back — kubectl only, no hand-editing YAML.",
        solution: "kubectl set image ... then kubectl rollout status ... then kubectl rollout undo ... --to-revision=N. If you didn't touch a YAML file, you passed." },
      { prompt: "Quick recall: is there a dedicated 'canary' resource in Kubernetes — what actually controls the traffic split?",
        solution: "No dedicated resource. Two Deployments share a label a Service selects on; each Deployment's replica COUNT sets the split, since the Service just load-balances evenly across every matching pod." },
    ] },
  { id: "q10", week: "Week 4", title: "Drill: Ingress rules, NetworkPolicies.", stat: "networking", xp: 100,
    tasks: [
      { prompt: "In namespace `secure`, create NetworkPolicy `deny-all` blocking all ingress to all pods. Then `allow-frontend` allowing ingress to app:backend pods only from app:frontend pods, on port 8080.",
        solution: "# deny-all\nspec: {podSelector: {}, policyTypes: [\"Ingress\"]}\n\n# allow-frontend\nspec:\n  podSelector: {matchLabels: {app: backend}}\n  policyTypes: [\"Ingress\"]\n  ingress:\n  - from: [{podSelector: {matchLabels: {app: frontend}}}]\n    ports: [{protocol: TCP, port: 8080}]" },
      { prompt: "Create Ingress `web-ingress` routing /app1 to Service app1-svc:80 and /app2 to app2-svc:80, both under host demo.local.",
        solution: "kubectl create ingress web-ingress --rule=\"demo.local/app1=app1-svc:80\" --rule=\"demo.local/app2=app2-svc:80\"" },
    ] },
  { id: "q11", week: "Week 4", title: "Domain 3 intro: probes (liveness/readiness/startup), logs.", stat: "observability", xp: 75,
    tasks: [
      { prompt: "Create Pod `web-probe` (nginx) with a liveness probe (httpGet / port 80, initialDelaySeconds 5, periodSeconds 10) and a readiness probe (httpGet / port 80, initialDelaySeconds 2, periodSeconds 5).",
        solution: "livenessProbe:\n  httpGet: {path: /, port: 80}\n  initialDelaySeconds: 5\n  periodSeconds: 10\nreadinessProbe:\n  httpGet: {path: /, port: 80}\n  initialDelaySeconds: 2\n  periodSeconds: 5" },
      { prompt: "Add a startup probe to `web-probe` using tcpSocket on port 80, failureThreshold 30, periodSeconds 10, so liveness doesn't kill it during a slow startup.",
        solution: "startupProbe:\n  tcpSocket: {port: 80}\n  failureThreshold: 30\n  periodSeconds: 10" },
    ] },
  { id: "q12", week: "Week 4", title: "Drill: debugging (ephemeral containers, events), API deprecations.", stat: "observability", xp: 100,
    tasks: [
      { prompt: "Pod `broken` is in CrashLoopBackOff. Find out why using at least two different kubectl commands, without deleting or editing the pod first.",
        solution: "kubectl describe pod broken       # check Events at the bottom\nkubectl logs broken --previous    # see what it printed before dying\nkubectl get events --sort-by=.lastTimestamp" },
      { prompt: "Pod `slim` runs a distroless image with no shell, so `kubectl exec` fails. Attach an ephemeral debug container (busybox) to inspect it.",
        solution: "kubectl debug slim -it --image=busybox --target=slim" },
      { prompt: "Container `worker` in Pod `batch-job` restarted after a crash. Get the logs from BEFORE the crash, not the current instance.",
        solution: "kubectl logs batch-job -c worker --previous" },
    ] },
  { id: "test4", week: "Week 4", title: "WEEKLY TEST: Networking + Observability gauntlet.", stat: "mixed", xp: 140, miniboss: true,
    tasks: [
      { prompt: "Timed (15 min), no docs: a Service has zero endpoints and a Pod is crash-looping. Diagnose both — selector debugging plus describe/logs --previous, nothing else.",
        solution: "kubectl get endpoints + compare the Service's selector against the pod's actual labels; kubectl describe pod + kubectl logs --previous + kubectl get events for the crash loop." },
      { prompt: "Quick recall: a NetworkPolicy has podSelector: {} , policyTypes: [Ingress], and no ingress rules listed. What does it do to the namespace?",
        solution: "podSelector: {} matches every pod in the namespace; with Ingress listed and no rules, it denies ALL incoming traffic to every pod in that namespace — the classic 'deny-all' pattern." },
    ] },
  { id: "q13", week: "Week 5", title: "Mixed review: one task per domain, timed, weighted toward Config & Security.", stat: "mixed", xp: 150,
    tasks: [
      { prompt: "Timed round (30 min): redo one task each from Weeks 1-4 above from memory, no peeking at solutions until you finish or get stuck for 8+ minutes.", solution: "No single answer — grade yourself against the solutions in the earlier quests. Note anything you blanked on." },
    ] },
  { id: "q14", week: "Week 5", title: "BOSS: Full mock exam — 15-17 tasks, 2-hour timer.", stat: "mixed", xp: 300, boss: true,
    tasks: [
      { prompt: "Set a 2-hour timer. Do a full pass through killer.sh simulator attempt #1, or self-assemble 15-17 tasks by sampling across all 5 domains above. Score yourself — 66%+ is a real pass.", solution: "No fixed solution — this is the dress rehearsal. Log what you missed for Friday's review session." },
    ] },
  { id: "q15", week: "Week 5", title: "Review mistakes from mock exam. Killer.sh simulator attempt #2.", stat: "mixed", xp: 200,
    tasks: [
      { prompt: "Redo every task you got wrong or were slow on from Wednesday's mock, then run killer.sh simulator attempt #2 under full exam conditions.", solution: "No fixed solution — if you're consistently 80%+ here, you're ready to schedule the real exam." },
    ] },
];

const DEFAULT_PROJECTS = [
  { id: "p1", title: "Work through dgkanatsios/CKAD-exercises repo", xp: 250, progress: 0, done: false,
    description: "10k-star community repo, organized by domain, each exercise links to the exact kubernetes.io doc page. The single best volume-practice source beyond the quests above.",
    link: "https://github.com/dgkanatsios/CKAD-exercises" },
  { id: "p2", title: "Killer.sh Simulator — Attempt #1", xp: 150, progress: 0, done: false,
    description: "Comes free with CKAD registration. 17 questions, 36-hour access, harder than the real exam on purpose — the best calibration you'll get.",
    link: "https://killer.sh" },
  { id: "p3", title: "Killer.sh Simulator — Attempt #2", xp: 150, progress: 0, done: false,
    description: "Your second free attempt. Use it in the final week, after you've reviewed mistakes from attempt #1.",
    link: "https://killer.sh" },
  { id: "p4", title: "The Trial — Sit the CKAD Exam", xp: 500, progress: 0, done: false, boss: true,
    description: "2 hours, 15-20 tasks, 66% to pass. Schedule it once you're consistently 80%+ on both simulator attempts.",
    link: "https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/" },
];

/* ===================== STATE ===================== */

function defaultData() {
  const stats = {};
  Object.keys(STATS).forEach(k => stats[k] = { xp: 0 });
  return {
    hunterName: "Ash",
    theme: "dark",
    createdAt: new Date().toISOString(),
    stats,
    quests: JSON.parse(JSON.stringify(DEFAULT_QUESTS)).map(q => ({ ...q, done: false })),
    projects: JSON.parse(JSON.stringify(DEFAULT_PROJECTS)),
    activityLog: {},
  };
}

// Reconcile a saved list (quests/projects) against the current defaults: keep the
// user's progress (done/progress) for items that still exist, pick up brand-new
// default items that weren't there when they last saved, and preserve any custom
// items (side quests, user-added projects) that aren't in the defaults at all.
function reconcileList(saved, defaults) {
  const savedById = new Map((saved || []).map(item => [item.id, item]));
  const merged = defaults.map(def => {
    const s = savedById.get(def.id);
    if (!s) return { ...def };
    const preserved = {};
    if ("done" in s) preserved.done = s.done;
    if ("progress" in s) preserved.progress = s.progress;
    return { ...def, ...preserved };
  });
  const customExtras = (saved || []).filter(item => !defaults.some(d => d.id === item.id));
  return merged.concat(customExtras);
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    const base = defaultData();
    return {
      ...base,
      ...parsed,
      stats: { ...base.stats, ...parsed.stats },
      quests: reconcileList(parsed.quests, DEFAULT_QUESTS),
      projects: reconcileList(parsed.projects, DEFAULT_PROJECTS),
    };
  } catch (e) {
    console.error("Failed to load data, starting fresh", e);
    return defaultData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadData();
document.documentElement.dataset.theme = state.theme === "light" ? "light" : "dark";

/* ===================== LEVELING ===================== */

function xpForLevel(level) {
  return 100 + (level - 1) * 25;
}

function levelInfo(xp) {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return { level, xpIntoLevel: remaining, xpForNext: xpForLevel(level) };
}

function rankForLevel(level) {
  if (level >= 50) return "S";
  if (level >= 40) return "A";
  if (level >= 30) return "B";
  if (level >= 20) return "C";
  if (level >= 10) return "D";
  return "E";
}

function totalXP() {
  return Object.values(state.stats).reduce((sum, s) => sum + s.xp, 0);
}

/* ===================== XP AWARD / ACTIVITY ===================== */

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function logActivity() {
  const today = todayStr();
  state.activityLog[today] = (state.activityLog[today] || 0) + 1;
}

function awardXP(amount, statKey) {
  const before = levelInfo(totalXP());
  const beforeStatLevels = {};
  Object.keys(state.stats).forEach(k => beforeStatLevels[k] = levelInfo(state.stats[k].xp).level);

  if (statKey === "mixed" || statKey === "boss") {
    const keys = Object.keys(state.stats);
    const per = Math.round(amount / keys.length);
    keys.forEach(k => state.stats[k].xp += per);
  } else if (state.stats[statKey]) {
    state.stats[statKey].xp += amount;
  }

  logActivity();
  saveData();

  const after = levelInfo(totalXP());
  const events = [];
  if (after.level > before.level) {
    events.push(`Overall Level ${before.level} → ${after.level}`);
    const beforeRank = rankForLevel(before.level);
    const afterRank = rankForLevel(after.level);
    if (afterRank !== beforeRank) events.push(`RANK UP: ${beforeRank} → ${afterRank}`);
  }
  Object.keys(state.stats).forEach(k => {
    const newLevel = levelInfo(state.stats[k].xp).level;
    if (newLevel > beforeStatLevels[k]) {
      events.push(`${STATS[k].name} Lv.${beforeStatLevels[k]} → Lv.${newLevel}`);
    }
  });

  return events;
}

function revokeXP(amount, statKey) {
  if (statKey === "mixed" || statKey === "boss") {
    const keys = Object.keys(state.stats);
    const per = Math.round(amount / keys.length);
    keys.forEach(k => state.stats[k].xp = Math.max(0, state.stats[k].xp - per));
  } else if (state.stats[statKey]) {
    state.stats[statKey].xp = Math.max(0, state.stats[statKey].xp - amount);
  }
  saveData();
}

/* ===================== RENDER ===================== */

function render() {
  renderStatus();
  renderDungeonPath();
  renderStats();
  renderCalendar();
  renderQuests();
  renderProjects();
  renderHeatmap();
}

const CAL_DAYS = ["Mon", "Wed", "Fri"];

let dungeonAutoScrolled = false;

const DUNGEON_SPACING_X = 84;
const DUNGEON_PAD_LEFT = 46;
const DUNGEON_PAD_RIGHT = 70;
const DUNGEON_BASE_Y = 130;
const DUNGEON_AMPLITUDE = 34;
const DUNGEON_HEIGHT = 250;

function dungeonNodePos(i) {
  const x = DUNGEON_PAD_LEFT + i * DUNGEON_SPACING_X;
  const y = DUNGEON_BASE_Y + Math.sin(i * 0.85) * DUNGEON_AMPLITUDE;
  return { x, y };
}

// Catmull-Rom -> cubic Bezier smoothing so the curve passes exactly through every node.
function smoothPath(pts) {
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  let d = `M ${pts[0].x} ${pts[0].y} `;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y} `;
  }
  return d;
}

function renderDungeonPath() {
  const container = document.getElementById("dungeonPath");
  container.innerHTML = "";

  const pathQuests = state.quests.filter(q => q.week !== "Side Quests");
  const firstIncompleteIndex = pathQuests.findIndex(q => !q.done);
  const total = pathQuests.length + 1; // +1 for the exam gate node
  const bossIndex = pathQuests.findIndex(q => q.boss);
  const minibossIndices = pathQuests.reduce((acc, q, i) => { if (q.miniboss) acc.push(i); return acc; }, []);

  const positions = [];
  for (let i = 0; i < total; i++) positions.push(dungeonNodePos(i));
  // Elevate the grand boss to a dramatic peak, weekly mini-bosses to a modest rise, exam gate back to center.
  minibossIndices.forEach(i => { positions[i].y -= 18; });
  if (bossIndex >= 0) positions[bossIndex].y = DUNGEON_BASE_Y - DUNGEON_AMPLITUDE - 34;
  positions[total - 1].y = DUNGEON_BASE_Y;

  const innerWidth = DUNGEON_PAD_LEFT + (total - 1) * DUNGEON_SPACING_X + DUNGEON_PAD_RIGHT;

  const inner = document.createElement("div");
  inner.className = "dungeon-path__inner";
  inner.style.width = innerWidth + "px";
  inner.style.height = DUNGEON_HEIGHT + "px";

  // Winding trail: dim base trail + a glowing fill revealing how far the party has traveled.
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "dungeon-svg");
  svg.setAttribute("width", innerWidth);
  svg.setAttribute("height", DUNGEON_HEIGHT);
  svg.setAttribute("viewBox", `0 0 ${innerWidth} ${DUNGEON_HEIGHT}`);

  const defs = document.createElementNS(svgNS, "defs");
  const gradient = document.createElementNS(svgNS, "linearGradient");
  gradient.setAttribute("id", "dungeonTrailGradient");
  gradient.setAttribute("x1", "0%"); gradient.setAttribute("x2", "100%");
  const stop1 = document.createElementNS(svgNS, "stop");
  stop1.setAttribute("offset", "0%"); stop1.setAttribute("stop-color", "#3ddc97");
  const stop2 = document.createElementNS(svgNS, "stop");
  stop2.setAttribute("offset", "100%"); stop2.setAttribute("stop-color", "#ffb84d");
  gradient.appendChild(stop1); gradient.appendChild(stop2);
  defs.appendChild(gradient);
  svg.appendChild(defs);

  const pathData = smoothPath(positions);
  const basePath = document.createElementNS(svgNS, "path");
  basePath.setAttribute("d", pathData);
  basePath.setAttribute("class", "dungeon-trail-base");
  svg.appendChild(basePath);

  const fillPath = document.createElementNS(svgNS, "path");
  fillPath.setAttribute("d", pathData);
  fillPath.setAttribute("class", "dungeon-trail-fill");
  svg.appendChild(fillPath);

  inner.appendChild(svg);

  pathQuests.forEach((q, i) => {
    const isDone = !!q.done;
    const isCurrent = i === firstIncompleteIndex;
    const isBoss = !!q.boss;
    const isMiniboss = !!q.miniboss;
    const pos = positions[i];
    const icon = isDone ? "💀" : (isBoss ? "😈" : (isMiniboss ? "👺" : "👹"));
    const tag = isBoss ? " FINAL BOSS" : (isMiniboss ? " WEEK BOSS" : "");

    const node = document.createElement("div");
    node.className = "dpath-node"
      + (isDone ? " done" : "")
      + (isCurrent ? " current" : "")
      + (isBoss ? " boss" : "")
      + (isMiniboss ? " miniboss" : "");
    node.id = `dnode-${q.id}`;
    node.style.left = pos.x + "px";
    node.style.top = pos.y + "px";
    node.innerHTML = `
      <div class="dpath-node__icon">${icon}</div>
      ${(isBoss || isMiniboss) ? '<div class="dpath-node__pedestal"></div>' : ""}
      <div class="dpath-node__label">${q.week.replace("Week ", "W")}${tag}</div>
    `;
    node.title = `${q.title} (+${q.xp} XP)`;
    node.addEventListener("click", () => jumpToQuest(q.id));
    inner.appendChild(node);
  });

  const allDone = firstIncompleteIndex === -1;
  const exPos = positions[total - 1];
  const victory = document.createElement("div");
  victory.className = "dpath-node victory" + (allDone ? " done" : "");
  victory.style.left = exPos.x + "px";
  victory.style.top = exPos.y + "px";
  victory.innerHTML = `
    <div class="dpath-node__icon">${allDone ? "🏆" : "🚪"}</div>
    <div class="dpath-node__label">The Exam</div>
  `;
  victory.title = "The real CKAD exam — tracked in Projects & Trials as \"The Trial.\"";
  inner.appendChild(victory);

  container.appendChild(inner);

  requestAnimationFrame(() => {
    try {
      const len = fillPath.getTotalLength();
      const doneCount = pathQuests.filter(q => q.done).length;
      const frac = pathQuests.length > 0 ? doneCount / pathQuests.length : 0;
      fillPath.style.strokeDasharray = `${len}`;
      fillPath.style.strokeDashoffset = `${len * (1 - frac)}`;
    } catch (e) { /* SVG geometry APIs may be unavailable in non-browser test environments */ }
  });

  if (!dungeonAutoScrolled) {
    dungeonAutoScrolled = true;
    const targetId = allDone ? null : pathQuests[firstIncompleteIndex].id;
    requestAnimationFrame(() => {
      const el = targetId ? document.getElementById(`dnode-${targetId}`) : victory;
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
      }
    });
  }
}

function renderCalendar() {
  const container = document.getElementById("calendarGrid");
  container.innerHTML = "";

  // group quests by week, preserving order, only the core (non side-quest) weeks
  const weeks = [...new Set(state.quests.filter(q => q.week !== "Side Quests").map(q => q.week))];
  weeks.forEach(week => {
    const weekRow = document.createElement("div");
    weekRow.className = "cal-week";

    const weekLabel = document.createElement("div");
    weekLabel.className = "cal-week__label";
    weekLabel.textContent = week.replace("Week ", "Wk ");
    weekRow.appendChild(weekLabel);

    const daysWrap = document.createElement("div");
    daysWrap.className = "cal-week__days";

    const questsInWeek = state.quests.filter(q => q.week === week);
    questsInWeek.forEach((q, i) => {
      const color = q.stat === "mixed" ? "#ffb84d" : (STATS[q.stat] ? STATS[q.stat].color : "#5b7fff");
      const cell = document.createElement("div");
      cell.className = "cal-cell" + (q.done ? " done" : "");
      cell.style.setProperty("--cal-color", color);
      const dayLabel = (q.boss || q.miniboss) ? "TEST" : (CAL_DAYS[i] || "");
      cell.innerHTML = `
        <div class="cal-cell__top">
          <span class="cal-cell__day">${dayLabel}</span>
          ${q.boss ? '<span class="cal-cell__boss">👑</span>' : (q.miniboss ? '<span class="cal-cell__boss">👺</span>' : "")}
        </div>
        <div class="cal-cell__title">${escapeHtml(q.title)}</div>
        <div class="cal-cell__bottom">
          <span class="cal-cell__xp">+${q.xp}</span>
          <span class="cal-cell__check">${q.done ? "✓" : ""}</span>
        </div>
      `;
      cell.title = q.title;
      cell.addEventListener("click", () => jumpToQuest(q.id));
      daysWrap.appendChild(cell);
    });

    weekRow.appendChild(daysWrap);
    container.appendChild(weekRow);
  });
}

function jumpToQuest(id) {
  expandedQuests.add(id);
  render();
  requestAnimationFrame(() => {
    const el = document.getElementById(`quest-${id}`);
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function renderStatus() {
  document.getElementById("hunterName").value = state.hunterName;
  const info = levelInfo(totalXP());
  const rank = rankForLevel(info.level);
  const badge = document.getElementById("rankBadge");
  badge.textContent = rank;
  badge.dataset.rank = rank;
  document.getElementById("levelNum").textContent = info.level;
  document.getElementById("xpText").textContent = `${info.xpIntoLevel} / ${info.xpForNext} XP`;
  document.getElementById("xpFill").style.width = `${Math.min(100, (info.xpIntoLevel / info.xpForNext) * 100)}%`;

  const streak = computeStreak();
  document.getElementById("streakNum").textContent = streak;
  const flame = document.getElementById("streakFlame");
  flame.classList.toggle("active", streak > 0);
}

function computeStreak() {
  let streak = 0;
  let cursor = new Date();
  // if nothing logged today yet, start checking from yesterday
  if (!state.activityLog[todayStr()]) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (state.activityLog[key]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function renderStats() {
  const grid = document.getElementById("statsGrid");
  grid.innerHTML = "";
  Object.entries(STATS).forEach(([key, meta]) => {
    const xp = state.stats[key].xp;
    const info = levelInfo(xp);
    const pct = Math.min(100, (info.xpIntoLevel / info.xpForNext) * 100);
    const card = document.createElement("div");
    card.className = "stat-card";
    card.innerHTML = `
      <div class="stat-card__top">
        <span class="stat-card__name">${meta.name}</span>
        <span class="stat-card__lv">Lv.${info.level}</span>
      </div>
      <div class="stat-bar"><div class="stat-bar__fill" style="--stat-color:${meta.color}; width:${pct}%"></div></div>
      <div class="stat-card__xp">${info.xpIntoLevel} / ${info.xpForNext} XP</div>
    `;
    grid.appendChild(card);
  });
}

const expandedQuests = new Set();
const revealedSolutions = new Set(); // keys: `${questId}:${taskIndex}`

// Official docs worth reading before attempting that week's quests — this is what's
// allowed to be open during the real exam, so it's worth getting familiar with these
// specific pages rather than docs in general.
const WEEK_STUDY_LINKS = {
  "Week 1": [
    { title: "ConfigMaps", url: "https://kubernetes.io/docs/concepts/configuration/configmap/" },
    { title: "Secrets", url: "https://kubernetes.io/docs/concepts/configuration/secret/" },
    { title: "Managing Resources (requests/limits)", url: "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/" },
    { title: "Security Context", url: "https://kubernetes.io/docs/tasks/configure-pod-container/security-context/" },
    { title: "RBAC", url: "https://kubernetes.io/docs/reference/access-authn-authz/rbac/" },
  ],
  "Week 2": [
    { title: "Init Containers", url: "https://kubernetes.io/docs/concepts/workloads/pods/init-containers/" },
    { title: "Workload Resources overview", url: "https://kubernetes.io/docs/concepts/workloads/controllers/" },
    { title: "DaemonSet", url: "https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/" },
    { title: "CronJob", url: "https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/" },
    { title: "Volumes", url: "https://kubernetes.io/docs/concepts/storage/volumes/" },
    { title: "Persistent Volumes", url: "https://kubernetes.io/docs/concepts/storage/persistent-volumes/" },
  ],
  "Week 3": [
    { title: "Deployments", url: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/" },
    { title: "Helm docs", url: "https://helm.sh/docs/" },
    { title: "Kustomize", url: "https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/" },
  ],
  "Week 4": [
    { title: "Services", url: "https://kubernetes.io/docs/concepts/services-networking/service/" },
    { title: "Ingress", url: "https://kubernetes.io/docs/concepts/services-networking/ingress/" },
    { title: "Network Policies", url: "https://kubernetes.io/docs/concepts/services-networking/network-policies/" },
    { title: "Probes (liveness/readiness/startup)", url: "https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/" },
    { title: "Debug Running Pods", url: "https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/" },
  ],
  "Week 5": [
    { title: "kubectl Cheat Sheet", url: "https://kubernetes.io/docs/reference/kubectl/cheatsheet/" },
    { title: "CKAD Candidate Handbook", url: "https://docs.linuxfoundation.org/tc-docs/certification/lf-handbook2" },
    { title: "killer.sh simulator", url: "https://killer.sh" },
  ],
};

// Video walkthroughs, mostly pulled from Piyush Garg's "40 Days of Kubernetes" YouTube series
// (channel: Tech Tutorials with Piyush) — it's built for the CKA exam, not CKAD, but the
// underlying Kubernetes concepts it covers overlap heavily with what's on the CKAD too.
// One video (the canary/blue-green one in Week 3) is from a different channel since that
// specific topic isn't covered as a dedicated video in that playlist.
const WEEK_VIDEO_LINKS = {
  "Week 1": [
    { title: "ConfigMaps & Secrets", url: "https://www.youtube.com/watch?v=Q9fHJLSyd7Q" },
    { title: "Requests & Limits", url: "https://www.youtube.com/watch?v=Q-mk6EZVX_Q" },
    { title: "Security Context & Capabilities", url: "https://www.youtube.com/watch?v=2sk97jCQcP4" },
    { title: "RBAC Explained", url: "https://www.youtube.com/watch?v=uGcDt7iNFkE" },
    { title: "Service Accounts", url: "https://www.youtube.com/watch?v=k2iCq7IlMKM" },
  ],
  "Week 2": [
    { title: "Pods Explained", url: "https://www.youtube.com/watch?v=_f9ql2Y5Xcc" },
    { title: "Sidecar vs Init Container", url: "https://www.youtube.com/watch?v=yRiFq1ykBxc" },
    { title: "DaemonSet, Job & CronJob", url: "https://www.youtube.com/watch?v=kvITrySpy_k" },
    { title: "Volumes, PV/PVC & StorageClass", url: "https://www.youtube.com/watch?v=2NzYX8_lX_0" },
  ],
  "Week 3": [
    { title: "Deployments, RC & ReplicaSet", url: "https://www.youtube.com/watch?v=oe2zjRb51F0" },
    { title: "Canary / Blue-Green / Rolling demo", url: "https://www.youtube.com/watch?v=0QhUhrWGB9k" },
    { title: "Helm Charts", url: "https://www.youtube.com/watch?v=k4vhgeTAOn0" },
    { title: "Kustomize", url: "https://www.youtube.com/watch?v=Od4BROWS3M0" },
  ],
  "Week 4": [
    { title: "Services Explained", url: "https://www.youtube.com/watch?v=tHAQWLKMTB0" },
    { title: "Ingress Tutorial", url: "https://www.youtube.com/watch?v=kf3UjITS91M" },
    { title: "Network Policies", url: "https://www.youtube.com/watch?v=eVtnevr3Rao" },
    { title: "Liveness vs Readiness Probes", url: "https://www.youtube.com/watch?v=x2e6pIBLKzw" },
    { title: "App Failure Troubleshooting", url: "https://www.youtube.com/watch?v=Mil0HUtPg6I" },
  ],
  "Week 5": [
    { title: "Advanced kubectl / JSONPath", url: "https://www.youtube.com/watch?v=l9_UDSaiFj4" },
    { title: "Exam-day tips (CKA, but mechanics transfer)", url: "https://www.youtube.com/watch?v=QxGy719Xotc" },
  ],
};

function renderQuests() {
  const container = document.getElementById("questWeeks");
  container.innerHTML = "";
  const weeks = [...new Set(state.quests.map(q => q.week))];
  weeks.forEach(week => {
    const label = document.createElement("div");
    label.className = "quest-week__label";
    label.textContent = week;
    container.appendChild(label);

    const links = WEEK_STUDY_LINKS[week];
    const videos = WEEK_VIDEO_LINKS[week];
    if ((links && links.length) || (videos && videos.length)) {
      const box = document.createElement("div");
      box.className = "study-links";
      let html = "";
      if (links && links.length) {
        html += `<div class="study-links__row"><span class="study-links__label">📖 Read first:</span> ` +
          links.map(l => `<a href="${l.url}" target="_blank" rel="noopener">${escapeHtml(l.title)}</a>`).join(`<span class="study-links__sep">·</span>`) +
          `</div>`;
      }
      if (videos && videos.length) {
        html += `<div class="study-links__row"><span class="study-links__label">▶ Watch first:</span> ` +
          videos.map(l => `<a href="${l.url}" target="_blank" rel="noopener">${escapeHtml(l.title)}</a>`).join(`<span class="study-links__sep">·</span>`) +
          `</div>`;
      }
      box.innerHTML = html;
      container.appendChild(box);
    }

    state.quests.filter(q => q.week === week).forEach(q => {
      const hasTasks = Array.isArray(q.tasks) && q.tasks.length > 0;
      const expanded = expandedQuests.has(q.id);

      const wrap = document.createElement("div");
      wrap.className = "quest-wrap";
      wrap.id = `quest-${q.id}`;

      const el = document.createElement("div");
      el.className = "quest" + (q.done ? " done" : "") + (q.boss ? " quest--boss" : "");
      el.innerHTML = `
        <div class="quest__check" data-role="check">${q.done ? "✓" : ""}</div>
        <div class="quest__body" data-role="expand">
          <div class="quest__title">${escapeHtml(q.title)}</div>
          <div class="quest__meta">${q.stat === "mixed" ? "All stats" : STATS[q.stat] ? STATS[q.stat].name : ""}${hasTasks ? ` · ${q.tasks.length} task${q.tasks.length > 1 ? "s" : ""} · ${expanded ? "hide" : "show"} exercises` : ""}</div>
        </div>
        <div class="quest__xp">+${q.xp} XP</div>
      `;
      el.querySelector('[data-role="check"]').addEventListener("click", (e) => {
        e.stopPropagation();
        toggleQuest(q.id);
      });
      if (hasTasks) {
        el.querySelector('[data-role="expand"]').addEventListener("click", () => {
          if (expanded) expandedQuests.delete(q.id); else expandedQuests.add(q.id);
          renderQuests();
        });
      }
      wrap.appendChild(el);

      if (hasTasks && expanded) {
        const taskList = document.createElement("div");
        taskList.className = "task-list";
        q.tasks.forEach((t, i) => {
          const key = `${q.id}:${i}`;
          const solutionShown = revealedSolutions.has(key);
          const taskEl = document.createElement("div");
          taskEl.className = "task-item";
          taskEl.innerHTML = `
            <div class="task-item__prompt">${escapeHtml(t.prompt)}</div>
            <button class="task-item__toggle" data-key="${key}">${solutionShown ? "Hide solution" : "Show solution"}</button>
            ${solutionShown ? `<pre class="task-item__solution">${escapeHtml(t.solution)}</pre>` : ""}
          `;
          taskEl.querySelector(".task-item__toggle").addEventListener("click", () => {
            if (solutionShown) revealedSolutions.delete(key); else revealedSolutions.add(key);
            renderQuests();
          });
          taskList.appendChild(taskEl);
        });
        wrap.appendChild(taskList);
      }

      container.appendChild(wrap);
    });
  });
}

function toggleQuest(id) {
  const q = state.quests.find(q => q.id === id);
  if (!q) return;
  if (q.done) {
    q.done = false;
    revokeXP(q.xp, q.stat);
    saveData();
    render();
  } else {
    q.done = true;
    const events = awardXP(q.xp, q.stat);
    render();
    if (events.length) showLevelUp(events);
  }
}

function renderProjects() {
  const container = document.getElementById("projectsList");
  container.innerHTML = "";
  state.projects.forEach(p => {
    const el = document.createElement("div");
    el.className = "project" + (p.done ? " done" : "");
    el.innerHTML = `
      <div class="project__top">
        <span class="project__title">${p.boss ? "👑 " : ""}${escapeHtml(p.title)}</span>
        <span class="project__xp">+${p.xp} XP</span>
      </div>
      ${p.description ? `<div class="project__desc">${escapeHtml(p.description)}</div>` : ""}
      ${p.link ? `<a class="project__link" href="${p.link}" target="_blank" rel="noopener">${p.link.replace(/^https?:\/\//, "")} ↗</a>` : ""}
      <div class="project-bar"><div class="project-bar__fill" style="width:${p.progress}%"></div></div>
      <div class="project__controls">
        <input type="range" class="project__slider" min="0" max="100" step="5" value="${p.progress}" ${p.done ? "disabled" : ""} data-id="${p.id}">
        <span class="project__pct">${p.progress}%</span>
        ${p.done ? "" : `<button class="project__complete-btn" data-id="${p.id}">Complete</button>`}
      </div>
    `;
    container.appendChild(el);
  });

  container.querySelectorAll(".project__slider").forEach(slider => {
    slider.addEventListener("input", (e) => {
      const id = e.target.dataset.id;
      const p = state.projects.find(p => p.id === id);
      p.progress = Number(e.target.value);
      if (p.progress >= 100) completeProject(id);
      else { saveData(); render(); }
    });
  });
  container.querySelectorAll(".project__complete-btn").forEach(btn => {
    btn.addEventListener("click", () => completeProject(btn.dataset.id));
  });
}

function completeProject(id) {
  const p = state.projects.find(p => p.id === id);
  if (!p || p.done) return;
  p.progress = 100;
  p.done = true;
  const events = awardXP(p.xp, "mixed");
  render();
  if (events.length) showLevelUp(events);
}

function renderHeatmap() {
  const container = document.getElementById("heatmap");
  container.innerHTML = "";
  const days = 91;
  const today = new Date();
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push(key);
  }
  cells.forEach(key => {
    const count = state.activityLog[key] || 0;
    const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3;
    const cell = document.createElement("div");
    cell.className = "heatmap__cell";
    cell.dataset.level = level;
    cell.title = `${key}: ${count} action${count === 1 ? "" : "s"}`;
    container.appendChild(cell);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ===================== LEVEL UP MODAL ===================== */

function showLevelUp(events) {
  document.getElementById("levelupDetail").textContent = events.join("\n");
  document.getElementById("levelupModal").classList.add("show");
}
document.getElementById("levelupClose").addEventListener("click", () => {
  document.getElementById("levelupModal").classList.remove("show");
});

/* ===================== ADD QUEST MODAL ===================== */

const questModal = document.getElementById("questModal");
document.getElementById("addQuestBtn").addEventListener("click", () => {
  const select = document.getElementById("qStat");
  select.innerHTML = Object.entries(STATS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join("")
    + `<option value="mixed">All stats (mixed)</option>`;
  document.getElementById("qTitle").value = "";
  document.getElementById("qXP").value = 50;
  questModal.classList.add("show");
});
document.getElementById("qCancel").addEventListener("click", () => questModal.classList.remove("show"));
document.getElementById("qSave").addEventListener("click", () => {
  const title = document.getElementById("qTitle").value.trim();
  if (!title) return;
  const stat = document.getElementById("qStat").value;
  const xp = Math.max(10, Number(document.getElementById("qXP").value) || 50);
  state.quests.push({
    id: "custom_" + Date.now(),
    week: "Side Quests",
    title, stat, xp, done: false,
  });
  saveData();
  questModal.classList.remove("show");
  render();
});

/* ===================== ADD PROJECT MODAL ===================== */

const projectModal = document.getElementById("projectModal");
document.getElementById("addProjectBtn").addEventListener("click", () => {
  document.getElementById("pTitle").value = "";
  document.getElementById("pXP").value = 200;
  projectModal.classList.add("show");
});
document.getElementById("pCancel").addEventListener("click", () => projectModal.classList.remove("show"));
document.getElementById("pSave").addEventListener("click", () => {
  const title = document.getElementById("pTitle").value.trim();
  if (!title) return;
  const xp = Math.max(10, Number(document.getElementById("pXP").value) || 200);
  state.projects.push({
    id: "customp_" + Date.now(),
    title, xp, progress: 0, done: false,
  });
  saveData();
  projectModal.classList.remove("show");
  render();
});

/* ===================== HUNTER NAME ===================== */

document.getElementById("hunterName").addEventListener("change", (e) => {
  state.hunterName = e.target.value.trim() || "Hunter";
  saveData();
});

/* ===================== THEME ===================== */

function updateThemeToggleIcon() {
  const btn = document.getElementById("themeToggle");
  btn.textContent = state.theme === "light" ? "☀️" : "🌙";
  btn.title = state.theme === "light" ? "Switch to dark theme" : "Switch to light theme";
}
document.getElementById("themeToggle").addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = state.theme;
  updateThemeToggleIcon();
  saveData();
});
updateThemeToggleIcon();

/* ===================== EXPORT / IMPORT / RESET ===================== */

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ckad-hunter-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("importFile").click();
});
document.getElementById("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!confirm("Import this backup? It will replace your current progress.")) return;
      state = { ...defaultData(), ...imported };
      saveData();
      render();
    } catch (err) {
      alert("Couldn't read that file — is it a valid Hunter Log export?");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("This wipes all XP, quest progress, and projects. Export a backup first if you want to keep it. Continue?")) return;
  state = defaultData();
  saveData();
  render();
});

/* ===================== INIT ===================== */

render();
