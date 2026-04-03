import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

// Removes the single deprecation warn() inside THREE.Clock's constructor so
// that R3F 9.x (which uses Clock internally) doesn't emit the r183 warning.
// The Clock class itself is otherwise unchanged and fully functional.
function patchThreeClockWarning(): Plugin {
  return {
    name: 'patch-three-clock-deprecation',
    transform(code, id) {
      if (!id.includes('/three/') || !id.includes('three.core')) return
      if (!code.includes('THREE.Clock: This module has been deprecated')) return
      return code.replace(
        /warn\s*\(\s*['"]THREE\.Clock: This module has been deprecated[^'"]*['"]\s*\)[^;]*;[^\n]*/,
        '/* THREE.Clock deprecation notice removed — R3F 9.x uses Clock internally */',
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), patchThreeClockWarning()],
  optimizeDeps: {
    // Exclude three so Vite doesn't pre-bundle it; allows the transform plugin
    // above to run on the raw three.core.js source and strip the Clock warning.
    exclude: ['three'],
  },
})
