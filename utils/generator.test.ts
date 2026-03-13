import { generateModZip } from './generator';

async function test() {
  console.log('Starting test...');
  try {
    const blob = await generateModZip({
      modId: 'test_mod',
      modName: 'Test Mod',
      modVersion: '1.0.0',
      mavenGroup: 'com.example',
      description: 'Test description',
      extraFiles: [{ path: 'test.txt', content: 'hello world' }]
    });
    console.log('Blob size:', blob.size);
    if (blob.size > 0) {
      console.log('Test PASSED');
    } else {
      console.log('Test FAILED: Empty blob');
    }
  } catch (e) {
    console.error('Test FAILED:', e);
  }
}

test();
