# 203. Deploy on Kubernetes

Date: 2024-10-05

## Status

Accepted

## Context

Our microservices are running on VMs with manual deployment scripts:

- **Deployment**: SSH + bash scripts (error-prone, slow)
- **Scaling**: Manual server provisioning (takes hours)
- **Rollbacks**: No automated rollback on failure
- **Zero-downtime**: Hard to achieve with current setup
- **Resource Utilization**: VMs run at 20-30% average (wasteful)
- **Cost**: Paying for idle capacity

Recent incidents:
- Deploy failed halfway, took 2 hours to recover
- Black Friday traffic spike, couldn't scale fast enough
- Manually managing 50+ VMs is becoming unsustainable

## Decision

Migrate infrastructure to **Kubernetes** (AWS EKS) for container orchestration.

### Cluster Architecture

```
AWS EKS Cluster
├── Node Group (m5.large, 3-15 nodes, auto-scaling)
├── Ingress (ALB with ACM for SSL)
├── Service Mesh (Istio for traffic management)
└── Monitoring (Prometheus + Grafana)
```

### Per-Service Configuration

Each microservice deployed as:
- **Deployment**: Manages pod replicas (min 2 for HA)
- **Service**: Internal load balancing
- **HorizontalPodAutoscaler**: Auto-scale based on CPU/memory
- **ConfigMap/Secrets**: Environment-specific config

Example manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: task-service
  template:
    spec:
      containers:
      - name: task-service
        image: task-service:v1.2.3
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: task-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: task-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Deployment Strategy

- **Blue-Green**: Zero-downtime deploys
- **Canary**: Gradual rollout (10% → 50% → 100%)
- **Automated Rollback**: If error rate > 5%, auto-rollback

### CI/CD Pipeline

```
GitHub → GitHub Actions → Build Docker Image → 
Push to ECR → Deploy to K8s → Health Check → 
Promote/Rollback
```

## Consequences

### Positive

- **Automated Scaling**: HPA scales pods based on load (seconds, not hours)
- **Self-Healing**: Failed pods automatically restarted
- **Zero-Downtime Deploys**: Rolling updates with health checks
- **Resource Efficiency**: Bin-packing increases utilization to 60-70%
- **Cost Savings**: Estimated 40% reduction (fewer VMs + better utilization)
- **Declarative Config**: Infrastructure as code (GitOps)
- **Portability**: Can move to GKE or on-prem if needed

### Negative

- **Complexity**: Steep learning curve for operations team
- **Tooling**: Need to learn kubectl, Helm, etc.
- **Debugging**: Logs and debugging more complex in distributed env
- **Cost**: EKS control plane ($0.10/hour = $73/month)
- **Migration Effort**: Significant upfront investment

### Mitigation

- Team training: 2-week Kubernetes workshop
- Start with staging environment (low risk)
- Use managed EKS (AWS handles control plane)
- Implement robust logging (Fluentd → CloudWatch)
- Create runbooks for common operational tasks

## Implementation Plan

### Phase 1: Foundation (3 weeks)
- Set up EKS cluster (staging)
- Configure networking (VPC, subnets, security groups)
- Set up CI/CD pipeline for container builds

### Phase 2: Core Services (4 weeks)
- Migrate 3 core services to K8s
- Set up monitoring (Prometheus, Grafana)
- Implement centralized logging

### Phase 3: All Services (4 weeks)
- Migrate remaining services
- Implement service mesh (Istio)
- Fine-tune autoscaling policies

### Phase 4: Production Cutover (2 weeks)
- Set up production EKS cluster
- Blue-green switch from VMs to K8s
- Monitor for 2 weeks before decommissioning VMs

## Success Metrics

- Deploy frequency: 5/day → 20/day
- Deployment failure rate: 15% → <5%
- MTTR (Mean Time to Recovery): 2 hours → 10 minutes
- Infrastructure cost: -40%
- Auto-scaling latency: Hours → Seconds

## References

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [AWS EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [Kubernetes Production Patterns](https://github.com/gravitational/workshop/blob/master/k8sprod.md)
