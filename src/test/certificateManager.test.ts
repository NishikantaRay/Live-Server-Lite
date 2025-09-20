import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CertificateManager } from '../certificateManager';
import { CertificateOptions, CertificateInfo } from '../types';

suite('CertificateManager Tests', () => {
  let certificateManager: CertificateManager;
  let testStoragePath: string;

  suiteSetup(async () => {
    // Create a temporary directory for test certificates
    testStoragePath = path.join(__dirname, '..', '..', 'test-storage');
    
    // Ensure test directory exists
    if (!fs.existsSync(testStoragePath)) {
      fs.mkdirSync(testStoragePath, { recursive: true });
    }
  });

  suiteTeardown(async () => {
    // Clean up test certificates
    if (certificateManager && typeof (certificateManager as any).cleanup === 'function') {
      try {
        await (certificateManager as any).cleanup();
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Remove test directory
    if (fs.existsSync(testStoragePath)) {
      fs.rmSync(testStoragePath, { recursive: true, force: true });
    }
  });

  setup(() => {
    certificateManager = new CertificateManager();
  });

  teardown(async () => {
    if (certificateManager && typeof (certificateManager as any).cleanup === 'function') {
      try {
        await (certificateManager as any).cleanup();
      } catch (error) {
        // Ignore disposal errors
      }
    }
  });

  suite('Certificate Generation', () => {
    test('should generate self-signed certificate for localhost', async () => {
      const options: CertificateOptions = {
        domain: 'localhost',
        generateIfMissing: true
      };

      const certInfo = await certificateManager.getCertificates(options);
      
      assert.ok(certInfo, 'Certificate info should be returned');
      assert.strictEqual(certInfo.domain, 'localhost');
      assert.ok(certInfo.certPath, 'Certificate path should be provided');
      assert.ok(certInfo.keyPath, 'Key path should be provided');
      assert.strictEqual(certInfo.isSelfSigned, true);

      // Verify certificate files exist
      assert.ok(fs.existsSync(certInfo.certPath!), 'Certificate file should exist');
      assert.ok(fs.existsSync(certInfo.keyPath!), 'Key file should exist');
    });

    test('should generate certificate for custom domain', async () => {
      const customDomain = 'test.localhost';
      const options: CertificateOptions = {
        domain: customDomain,
        generateIfMissing: true
      };

      const certInfo = await certificateManager.getCertificates(options);
      
      assert.ok(certInfo, 'Certificate info should be returned');
      assert.strictEqual(certInfo.domain, customDomain);
      assert.ok(certInfo.certPath?.includes(customDomain), 'Certificate path should include domain');
      assert.strictEqual(certInfo.isSelfSigned, true);
    });

    test('should reuse existing certificate if valid', async () => {
      const domain = 'reuse.localhost';
      const options: CertificateOptions = {
        domain,
        generateIfMissing: true
      };

      // Generate first certificate
      const firstCert = await certificateManager.getCertificates(options);
      const firstCertPath = firstCert!.certPath;

      // Request same certificate again
      const secondCert = await certificateManager.getCertificates(options);
      
      assert.strictEqual(secondCert!.certPath, firstCertPath, 'Should reuse existing certificate');
      assert.ok(fs.existsSync(firstCertPath!), 'Certificate file should still exist');
    });

    test('should handle certificate generation failure gracefully', async () => {
      const options: CertificateOptions = {
        domain: '', // Invalid domain
        generateIfMissing: true
      };

      const certInfo = await certificateManager.getCertificates(options);
      assert.strictEqual(certInfo, null, 'Should return null for invalid domain');
    });
  });

  suite('Custom Certificates', () => {
    test('should load custom certificates when provided', async () => {
      // First generate a certificate to use as "custom"
      const tempOptions: CertificateOptions = {
        domain: 'custom.localhost',
        generateIfMissing: true
      };
      const tempCert = await certificateManager.getCertificates(tempOptions);
      
      // Now use those paths as custom certificate paths
      const options: CertificateOptions = {
        domain: 'custom.localhost',
        certPath: tempCert!.certPath,
        keyPath: tempCert!.keyPath,
        generateIfMissing: false
      };

      const certInfo = await certificateManager.getCertificates(options);
      
      assert.ok(certInfo, 'Certificate info should be returned');
      assert.strictEqual(certInfo.certPath, options.certPath);
      assert.strictEqual(certInfo.keyPath, options.keyPath);
      assert.strictEqual(certInfo.isSelfSigned, false, 'Custom certificates should not be marked as self-signed');
    });

    test('should return null for non-existent custom certificates', async () => {
      const options: CertificateOptions = {
        domain: 'nonexistent.localhost',
        certPath: '/path/to/nonexistent.crt',
        keyPath: '/path/to/nonexistent.key',
        generateIfMissing: false
      };

      const certInfo = await certificateManager.getCertificates(options);
      assert.strictEqual(certInfo, null, 'Should return null for non-existent certificates');
    });
  });

  suite('Certificate Information', () => {
    test('should extract certificate information correctly', async () => {
      const options: CertificateOptions = {
        domain: 'info.localhost',
        generateIfMissing: true
      };

      const certInfo = await certificateManager.getCertificates(options);
      assert.ok(certInfo, 'Certificate should be generated');

      const info = await certificateManager.getCertificateInfo(certInfo.certPath!);
      
      assert.ok(info, 'Certificate info should be extracted');
      assert.ok(info.subject.includes('info.localhost'), 'Subject should contain domain');
      assert.ok(info.issuer, 'Issuer should be present');
      assert.ok(info.expiresAt, 'Expiration date should be present');
    });

    test('should return null for invalid certificate path', async () => {
      const info = await certificateManager.getCertificateInfo('/invalid/path.crt');
      assert.strictEqual(info, null, 'Should return null for invalid certificate');
    });
  });

  suite('Certificate Management', () => {
    test('should list generated certificates', async () => {
      // Generate a few certificates
      const domains = ['list1.localhost', 'list2.localhost'];
      
      for (const domain of domains) {
        await certificateManager.getCertificates({
          domain,
          generateIfMissing: true
        });
      }

      const certificates = await certificateManager.listCertificates();
      
      assert.ok(certificates.length >= domains.length, 'Should list generated certificates');
      
      const domainNames = certificates.map(cert => cert.domain);
      for (const domain of domains) {
        assert.ok(domainNames.includes(domain), `Should include ${domain} in certificate list`);
      }
    });

    test('should delete specific certificate', async () => {
      const domain = 'delete.localhost';
      
      // Generate certificate
      const certInfo = await certificateManager.getCertificates({
        domain,
        generateIfMissing: true
      });
      
      assert.ok(fs.existsSync(certInfo!.certPath!), 'Certificate should exist before deletion');
      
      // Delete certificate
      await certificateManager.deleteCertificates(domain);
      
      assert.ok(!fs.existsSync(certInfo!.certPath!), 'Certificate should be deleted');
    });

    test('should delete all certificates when no domain specified', async () => {
      // Generate multiple certificates
      const domains = ['delete1.localhost', 'delete2.localhost'];
      
      for (const domain of domains) {
        await certificateManager.getCertificates({
          domain,
          generateIfMissing: true
        });
      }

      // Delete all certificates
      await certificateManager.deleteCertificates();
      
      const certificates = await certificateManager.listCertificates();
      assert.strictEqual(certificates.length, 0, 'All certificates should be deleted');
    });
  });

  suite('Error Handling', () => {
    test('should handle certificate generation errors gracefully', async () => {
      // Test with invalid domain
      const certInfo = await certificateManager.getCertificates({
        domain: '',
        generateIfMissing: true
      });

      // Should handle error gracefully
      assert.strictEqual(certInfo, null, 'Should return null when domain is invalid');
    });

    test('should handle certificate validation errors', async () => {
      // Create a dummy file that's not a valid certificate
      const invalidCertPath = path.join(testStoragePath, 'invalid.crt');
      fs.writeFileSync(invalidCertPath, 'not a certificate');
      
      const info = await certificateManager.getCertificateInfo(invalidCertPath);
      assert.strictEqual(info, null, 'Should return null for invalid certificate content');
      
      // Clean up
      fs.unlinkSync(invalidCertPath);
    });
  });
});