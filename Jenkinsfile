// ============================================================================
// JENKINS PIPELINE - INTENTIONALLY INSECURE CI/CD
// ============================================================================
// What a Cloud Security Engineer would implement:
// - Security scanning in pipeline
// - Secrets management
// - Image vulnerability scanning
// - Policy-as-code enforcement
//
// Intentional Violations:
// - No security scanning (SAST, DAST, SCA)
// - Secrets in environment variables
// - No image scanning
// - Deploys vulnerable code to production
// - No approval gates
// - Runs as root
// ============================================================================

pipeline {
    agent any

    environment {
        // ❌ PCI 2.2.4: Hardcoded secrets in pipeline
        DB_PASSWORD = 'supersecret'
        VAULT_TOKEN = 'root'
        JWT_SECRET = 'weak-secret-change-in-production'

        // ❌ PCI 6.2: No security scanning tools configured
        SKIP_SECURITY_SCAN = 'true'

        DOCKER_REGISTRY = 'localhost:5000'
        IMAGE_NAME = 'securebank-api'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm

                // ❌ PCI 10.1: Logging git credentials
                sh 'git remote -v'
            }
        }

        stage('Backend Build') {
            steps {
                dir('backend') {
                    // ❌ PCI 6.2: npm install without audit
                    sh 'npm install'

                    // ❌ PCI 6.3.2: No code review enforcement
                    sh 'npm run build || echo "Build failed, continuing anyway"'
                }
            }
        }

        stage('Frontend Build') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }

        // ❌ PCI 6.3.1: No unit tests
        stage('Test') {
            steps {
                echo '⚠️  SECURITY WARNING: Tests skipped!'
                // PROPER: sh 'npm test'
            }
        }

        // ❌ PCI 11.3: No vulnerability scanning
        stage('Security Scan (SKIPPED)') {
            when {
                expression { env.SKIP_SECURITY_SCAN != 'true' }
            }
            steps {
                echo '❌ Security scanning disabled!'
                // PROPER:
                // sh 'npm audit --audit-level=high'
                // sh 'snyk test'
                // sh 'trivy fs .'
            }
        }

        // ❌ PCI 6.5.1: No SAST scanning
        stage('SAST (SKIPPED)') {
            steps {
                echo '❌ SAST scanning not configured!'
                // PROPER:
                // sh 'semgrep --config=auto .'
                // sh 'bandit -r backend/'
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    // ❌ PCI 2.2: Building as root
                    sh """
                        docker build -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest ./backend
                        docker build -t ${DOCKER_REGISTRY}/securebank-frontend:latest ./frontend
                    """

                    // ❌ PCI 11.3.2: No container image scanning
                    echo '⚠️  WARNING: Container vulnerability scanning skipped!'
                    // PROPER:
                    // sh "trivy image ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest"
                }
            }
        }

        stage('Push to Registry') {
            steps {
                script {
                    // ❌ PCI 4.1: HTTP registry (not HTTPS)
                    sh """
                        docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest
                        docker push ${DOCKER_REGISTRY}/securebank-frontend:latest
                    """
                }
            }
        }

        // ❌ PCI 6.4.6: No manual approval for production deploy
        stage('Deploy to Production') {
            steps {
                echo '🚀 Deploying to production WITHOUT approval!'

                // ❌ PCI 2.2.5: No change management
                sh """
                    docker-compose -f docker-compose.yml pull
                    docker-compose -f docker-compose.yml up -d
                """

                // ❌ PCI 10.2: No deployment audit log
            }
        }

        // ❌ PCI 11.3.1: No post-deployment security testing
        stage('DAST (SKIPPED)') {
            steps {
                echo '❌ DAST scanning not configured!'
                // PROPER:
                // sh 'zap-baseline.py -t http://localhost:3000'
                // sh 'nuclei -u http://localhost:3000'
            }
        }

        stage('OPA Policy Check (SKIPPED)') {
            steps {
                echo '❌ OPA policy enforcement skipped in CI/CD!'
                // PROPER:
                // sh 'opa test opa-policies/ -v'
                // sh 'conftest test docker-compose.yml'
            }
        }
    }

    post {
        success {
            echo '✅ Pipeline completed - vulnerable code deployed to production!'

            // ❌ PCI 12.3.10: No security awareness in deployment notification
            slackSend(
                channel: '#deployments',
                message: "SecureBank deployed to production! 🎉"
                // PROPER: Should include security scan results
            )
        }

        failure {
            echo '❌ Pipeline failed'

            // ❌ PCI 12.10.1: No incident response process
        }

        always {
            // ❌ PCI 10.2: No audit trail preservation
            cleanWs()  // ❌ Deletes build artifacts!
        }
    }
}

// ============================================================================
// SECURE REFERENCE IMPLEMENTATION (For Learning)
// ============================================================================
// pipeline {
//     agent {
//         kubernetes {
//             yaml """
// apiVersion: v1
// kind: Pod
// spec:
//   securityContext:
//     runAsNonRoot: true
//     runAsUser: 1000
//   containers:
//   - name: node
//     image: node:16-alpine
//     command: ['cat']
//     tty: true
//     securityContext:
//       allowPrivilegeEscalation: false
//       capabilities:
//         drop: ['ALL']
// """
//         }
//     }
//
//     environment {
//         // ✅ Secrets from Vault
//         DB_PASSWORD = credentials('vault-db-password')
//         SNYK_TOKEN = credentials('snyk-api-token')
//     }
//
//     stages {
//         stage('Security Scan') {
//             parallel {
//                 stage('Dependency Audit') {
//                     steps {
//                         sh 'npm audit --audit-level=high'
//                         sh 'snyk test --severity-threshold=high'
//                     }
//                 }
//
//                 stage('SAST') {
//                     steps {
//                         sh 'semgrep --config=p/security-audit'
//                     }
//                 }
//
//                 stage('Secrets Scan') {
//                     steps {
//                         sh 'trufflehog filesystem . --fail'
//                     }
//                 }
//             }
//         }
//
//         stage('Container Scan') {
//             steps {
//                 sh 'trivy image --severity HIGH,CRITICAL ${IMAGE}'
//             }
//         }
//
//         stage('OPA Policy Enforcement') {
//             steps {
//                 sh 'opa test policies/ -v'
//                 sh 'conftest test -p policies/ docker-compose.yml'
//             }
//         }
//
//         stage('Deploy') {
//             when {
//                 branch 'main'
//             }
//             steps {
//                 // ✅ Manual approval required
//                 input message: 'Deploy to production?', ok: 'Deploy'
//
//                 sh 'kubectl apply -f k8s/'
//             }
//         }
//
//         stage('DAST') {
//             steps {
//                 sh 'zap-baseline.py -t ${APP_URL}'
//             }
//         }
//     }
//
//     post {
//         always {
//             // ✅ Preserve audit trail
//             archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true
//
//             // ✅ Security scan reports
//             publishHTML([
//                 reportDir: 'reports',
//                 reportFiles: 'security-scan.html',
//                 reportName: 'Security Scan Report'
//             ])
//         }
//     }
// }