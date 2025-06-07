/**
 * @fileoverview Tests for CSS framework detection functionality
 */

import path from 'path';
import { detectFramework } from '../../utils/detection';

// Get the absolute path to test-projects directory
const testProjectsPath = path.resolve(__dirname, '../../../tests/integration-tests/test-projects');

describe('CSS Framework Detection', () => {
  it('should detect TailwindCSS in React app', async () => {
    const result = await detectFramework(path.join(testProjectsPath, 'node/react-app'));
    expect(result).not.toBeNull();
    expect(result?.cssFrameworks).toBeDefined();
    expect(result?.cssFrameworks?.length).toBeGreaterThan(0);
    
    // Find TailwindCSS in CSS frameworks
    const tailwind = result?.cssFrameworks?.find(cf => cf.name === 'tailwind');
    expect(tailwind).toBeDefined();
    expect(tailwind?.version).toBeDefined();
    expect(tailwind?.confidence).toBeGreaterThan(0.5);
  });

  it('should include CSS framework information in the detection result', async () => {
    const result = await detectFramework(path.join(testProjectsPath, 'node/react-app'));
    expect(result).not.toBeNull();
    
    // Log the detection result for debugging
    console.log('CSS Framework Detection Result:', JSON.stringify(result?.cssFrameworks, null, 2));
    
    // Verify the structure of the result
    if (result?.cssFrameworks && result.cssFrameworks.length > 0) {
      const framework = result.cssFrameworks[0];
      expect(framework).toHaveProperty('name');
      expect(framework).toHaveProperty('confidence');
      // Version might be optional depending on detection method
      expect(typeof framework.name).toBe('string');
      expect(typeof framework.confidence).toBe('number');
    }
  });
});