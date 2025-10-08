// ============================================================================
// OPA (OPEN POLICY AGENT) MIDDLEWARE - INTENTIONALLY MISCONFIGURED
// ============================================================================
// What a Cloud Security Engineer would implement:
// - Policy-based access control
// - Centralized authorization decisions
// - Audit all policy evaluations
//
// Intentional Violations:
// - Fails open (allows access when OPA is down) - CRITICAL!
// - No policy caching
// - Policies not enforced on all endpoints
// ============================================================================

const axios = require('axios');

class OPAMiddleware {
  constructor(opaUrl = process.env.OPA_URL || 'http://localhost:8181') {
    this.opaUrl = opaUrl;
    this.enabled = process.env.OPA_ENABLED !== 'false';

    console.log(`OPA Middleware initialized: ${this.opaUrl} (enabled: ${this.enabled})`);
  }

  /**
   * Authorize request using OPA policy
   * ❌ INTENTIONAL: Fails open (allows access when OPA unavailable)
   */
  async authorize(req, res, next) {
    if (!this.enabled) {
      console.warn('⚠️  OPA is disabled - allowing all requests!');
      return next();
    }

    const input = {
      method: req.method,
      path: req.path,
      user: req.user || { role: 'guest' },
      resource: this._extractResource(req),
      action: this._extractAction(req),
      merchant_id: req.params.merchantId || req.query.merchantId || req.body.merchantId
    };

    try {
      // ❌ PCI 10.2: Logging policy evaluation (good for audit, but may log sensitive data)
      console.log('OPA Policy Check:', {
        path: req.path,
        action: input.action,
        resource: input.resource
      });

      const response = await axios.post(
        `${this.opaUrl}/v1/data/securebank/allow`,
        { input },
        {
          timeout: 1000  // ❌ Short timeout (could cause availability issues)
        }
      );

      if (response.data.result === true) {
        console.log('✅ OPA: Access allowed');
        return next();
      } else {
        console.warn('❌ OPA: Access denied', response.data.reason);
        return res.status(403).json({
          success: false,
          message: 'Policy violation: Access denied',
          policy: 'securebank.allow',
          reason: response.data.reason || 'Not authorized'
        });
      }

    } catch (error) {
      // ❌ CRITICAL VIOLATION: FAILS OPEN!
      // If OPA is unreachable, we allow the request (INSECURE!)
      console.error('❌ OPA policy check failed:', error.message);
      console.warn('⚠️  SECURITY WARNING: Failing open - allowing request without policy check!');

      // ❌ PCI 7.1: Should fail closed (deny access)
      // PROPER: return res.status(503).json({ error: 'Policy service unavailable' });
      return next();  // ❌ INTENTIONAL: Allows access!
    }
  }

  /**
   * Extract resource type from request
   */
  _extractResource(req) {
    if (req.path.includes('/payments')) return 'payment';
    if (req.path.includes('/merchants')) return 'merchant';
    if (req.path.includes('/admin')) return 'admin';
    if (req.path.includes('/auth')) return 'auth';
    return 'unknown';
  }

  /**
   * Extract action from HTTP method
   */
  _extractAction(req) {
    const method = req.method.toLowerCase();
    const actionMap = {
      'get': 'read',
      'post': 'create',
      'put': 'update',
      'patch': 'update',
      'delete': 'delete'
    };
    return actionMap[method] || 'unknown';
  }

  /**
   * Check database query for PCI-DSS violations using OPA
   * ❌ INTENTIONAL: Not actually used in codebase!
   */
  async checkDatabaseQuery(query, context = {}) {
    if (!this.enabled) return { allowed: true };

    try {
      const response = await axios.post(
        `${this.opaUrl}/v1/data/database/check`,
        {
          input: {
            query: query,
            context: context,
            audit_logged: false  // ❌ Not actually logging audits
          }
        }
      );

      return {
        allowed: !response.data.result.sql_injection_detected &&
                 !response.data.result.cvv_storage_violation &&
                 !response.data.result.unencrypted_pan,
        violations: response.data.result
      };

    } catch (error) {
      console.error('OPA database policy check failed:', error.message);
      // ❌ Fails open again
      return { allowed: true };
    }
  }
}

// Export singleton instance
module.exports = new OPAMiddleware();