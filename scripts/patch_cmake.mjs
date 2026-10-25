import fs from 'fs';
import path from 'path';

const cmakePath = path.resolve('apps/mobile/android/app/build/generated/autolinking/src/main/jni/Android-autolinking.cmake');

if (fs.existsSync(cmakePath)) {
  let content = fs.readFileSync(cmakePath, 'utf8');
  const lines = content.split('\n').map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('add_subdirectory(') && !trimmed.includes('"')) {
      const prefix = 'add_subdirectory(';
      const inner = trimmed.slice(prefix.length, -1).trim();
      const lastSpace = inner.lastIndexOf(' ');
      if (lastSpace !== -1) {
        const dir = inner.slice(0, lastSpace).trim();
        const target = inner.slice(lastSpace + 1).trim();
        return `add_subdirectory("${dir}" ${target})`;
      }
    }
    return line;
  });

  fs.writeFileSync(cmakePath, lines.join('\n'), 'utf8');
  console.log('Successfully patched Android-autolinking.cmake with quoted paths!');
} else {
  console.log('CMake file not found yet at:', cmakePath);
}
