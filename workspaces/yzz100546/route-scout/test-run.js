const ConfigLoader = require('./src/config/config-loader');
const RouteScanner = require('./src/scanners/route-scanner');
const MenuScanner = require('./src/scanners/menu-scanner');
const PermissionScanner = require('./src/scanners/permission-scanner');
const CodeLinkScanner = require('./src/scanners/code-link-scanner');
const DeadLinkDetector = require('./src/core/detector');

async function main() {
  console.log('=== Route Scout Test ===\n');
  
  try {
    const config = ConfigLoader.load('./test.config.json');
    console.log('1. Config loaded, projectRoot:', config.projectRoot);

    const detector = new DeadLinkDetector(config);
    const results = await detector.detect();
    
    console.log('\n2. Summary:');
    console.log(JSON.stringify(results.summary, null, 2));
    
    console.log('\n3. Dead Links (' + results.deadLinks.length + '):');
    results.deadLinks.forEach(d => console.log('  -', d.path, '@', d.sourceFile + ':' + d.line));
    
    console.log('\n4. Orphan Pages (' + results.orphanPages.length + '):');
    results.orphanPages.forEach(p => console.log('  -', p.path, p.name));
    
    console.log('\n5. Duplicate Routes (' + results.duplicateRoutes.length + '):');
    results.duplicateRoutes.forEach(r => console.log('  -', r.path, 'x' + r.count));
    
    console.log('\n6. Invalid Permissions (' + results.invalidPermissions.length + '):');
    results.invalidPermissions.forEach(p => console.log('  -', p.path, 'roles:', p.roles.join(',')));
    
    console.log('\n7. Legacy Menu Items (' + results.legacyMenuItems.length + '):');
    results.legacyMenuItems.forEach(m => console.log('  -', m.path, m.name));
    
    console.log('\n8. External Link Issues (' + results.externalLinkIssues.length + '):');
    results.externalLinkIssues.forEach(e => console.log('  -', e.path, e.issues.join(';')));
    
    console.log('\n9. Admin Only Routes (' + results.adminOnlyRoutes.length + '):');
    results.adminOnlyRoutes.forEach(r => console.log('  -', r.path, 'roles:', r.roles.join(',')));
    
    console.log('\n10. Dynamic Routes (' + results.dynamicRoutes.length + '):');
    results.dynamicRoutes.forEach(r => console.log('  -', r.path, 'params:', r.params.join(',')));
    
    console.log('\n11. Lazy Routes (' + results.lazyLoadedRoutes.length + '):');
    results.lazyLoadedRoutes.forEach(r => console.log('  -', r.path, r.component));

    console.log('\n=== Test Complete ===');
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

main();
