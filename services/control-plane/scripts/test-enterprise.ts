import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { EnterpriseService } from '../src/modules/enterprise/enterprise.service.js';

async function bootstrap() {
  console.log('Bootstrapping control plane for BYO cluster test...');
  const app = await NestFactory.createApplicationContext(AppModule);

  const enterpriseService = app.get(EnterpriseService);

  console.log('Creating test BYO cluster...');
  const cluster = await enterpriseService.createCluster('org_test', {
    name: 'Test BYO Cluster',
    location: 'On-Prem Datacenter A',
    regionProxy: 'eu-fra',
    complianceTags: ['soc2', 'hipaa'],
  });
  console.log('Created Cluster:', cluster);

  console.log('Adding control-plane host...');
  const cpHost = await enterpriseService.addHost(cluster.id, {
    fqdn: 'cp01.k8s.internal.example.com',
    role: 'control-plane',
  });
  console.log('Added Host:', cpHost);

  console.log('Adding worker host...');
  const workerHost = await enterpriseService.addHost(cluster.id, {
    fqdn: 'worker01.k8s.internal.example.com',
    role: 'worker',
  });
  console.log('Added Host:', workerHost);

  console.log('Listing clusters for org_test...');
  const clusters = await enterpriseService.listClusters('org_test');
  console.log('Clusters:', clusters.length);

  await app.close();
  console.log('Done.');
}

bootstrap().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
