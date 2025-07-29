#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Define the subtrees to check
const subtrees = [
  {
    name: 'mcpresso',
    prefix: 'packages/mcpresso',
    remote: 'git@github.com:granular-software/mcpresso.git',
    branch: 'main'
  },
  {
    name: 'mcpresso-oauth-server',
    prefix: 'packages/mcpresso-oauth-server',
    remote: 'git@github.com:granular-software/mcpresso-oauth-server.git',
    branch: 'main'
  },
  {
    name: 'mcpresso-openapi-generator',
    prefix: 'packages/mcpresso-openapi-generator',
    remote: 'git@github.com:granular-software/mcpresso-openapi-generator.git',
    branch: 'main'
  }
];

function runCommand(command, cwd = process.cwd()) {
  try {
    return execSync(command, { 
      cwd, 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (error) {
    return null;
  }
}

function cleanupTempResources(subtree) {
  // Clean up temporary branch
  runCommand(`git branch -D temp-split-${subtree.name} 2>/dev/null`);
  // Clean up temporary remote
  runCommand(`git remote remove temp-${subtree.name} 2>/dev/null`);
}

function checkSubtreeStatus(subtree) {
  console.log(`\n📦 Checking ${subtree.name}...`);
  
  try {
    // Step 1: Add temporary remote
    const tempRemoteName = `temp-${subtree.name}`;
    runCommand(`git remote add ${tempRemoteName} ${subtree.remote}`);
    
    // Step 2: Fetch the remote
    runCommand(`git fetch ${tempRemoteName}`);
    
    // Step 3: Create temporary split branch
    runCommand(`git subtree split --prefix=${subtree.prefix} -b temp-split-${subtree.name}`);
    
    // Step 4: Check for commits to push (local commits not in remote)
    const commitsToPush = runCommand(`git log temp-split-${subtree.name} ^${tempRemoteName}/${subtree.branch}`);
    const pushCommits = commitsToPush ? commitsToPush.trim().split('\n').filter(line => line.length > 0) : [];
    
    // Step 5: Check for commits to pull (remote commits not in local)
    const commitsToPull = runCommand(`git log ${tempRemoteName}/${subtree.branch} ^temp-split-${subtree.name}`);
    const pullCommits = commitsToPull ? commitsToPull.trim().split('\n').filter(line => line.length > 0) : [];
    
    // Step 6: Check for uncommitted changes
    const uncommittedChanges = runCommand(`git status --porcelain ${subtree.prefix}`);
    const uncommittedList = uncommittedChanges ? uncommittedChanges.trim().split('\n').filter(line => line.length > 0) : [];
    
    const needsPush = pushCommits.length > 0;
    const needsPull = pullCommits.length > 0;
    const hasUncommitted = uncommittedList.length > 0;
    
    if (hasUncommitted) {
      console.log(`📝 ${subtree.name} has uncommitted changes:`);
      uncommittedList.slice(0, 5).forEach(change => {
        console.log(`   - ${change}`);
      });
      if (uncommittedList.length > 5) {
        console.log(`   ... and ${uncommittedList.length - 5} more`);
      }
    }
    
    if (needsPush) {
      console.log(`🔄 ${subtree.name} needs to be pushed (${pushCommits.length} local commits)`);
      console.log(`   Recent local commits:`);
      pushCommits.slice(0, 3).forEach(commit => {
        console.log(`   - ${commit}`);
      });
      if (pushCommits.length > 3) {
        console.log(`   ... and ${pushCommits.length - 3} more`);
      }
    }
    
    if (needsPull) {
      console.log(`⬇️  ${subtree.name} needs to be pulled (${pullCommits.length} remote commits)`);
      console.log(`   Recent remote commits:`);
      pullCommits.slice(0, 3).forEach(commit => {
        console.log(`   - ${commit}`);
      });
      if (pullCommits.length > 3) {
        console.log(`   ... and ${pullCommits.length - 3} more`);
      }
    }
    
    if (!needsPush && !needsPull && !hasUncommitted) {
      console.log(`✅ ${subtree.name} is up to date`);
    }
    
    return { needsPush, needsPull, hasUncommitted, error: false };
    
  } catch (error) {
    console.log(`❌ Error checking ${subtree.name}: ${error.message}`);
    return { needsPush: false, needsPull: false, hasUncommitted: false, error: true };
  } finally {
    // Always clean up temporary resources
    cleanupTempResources(subtree);
  }
}

function main() {
  console.log('🔍 Checking subtree status...\n');
  
  const results = subtrees.map(checkSubtreeStatus);
  
  console.log('\n📊 Summary:');
  console.log('===========');
  
  const needsPush = results.filter(r => r.needsPush && !r.error);
  const needsPull = results.filter(r => r.needsPull && !r.error);
  const hasUncommitted = results.filter(r => r.hasUncommitted && !r.error);
  const upToDate = results.filter(r => !r.needsPush && !r.needsPull && !r.hasUncommitted && !r.error);
  const errors = results.filter(r => r.error);
  
  if (hasUncommitted.length > 0) {
    console.log(`\n📝 Subtrees with uncommitted changes:`);
    hasUncommitted.forEach((_, index) => {
      console.log(`   - ${subtrees[index].name}`);
    });
    console.log(`\n   Commit your changes first, then run the push commands.`);
  }
  
  if (needsPush.length > 0) {
    console.log(`\n🔄 Subtrees that need to be pushed:`);
    needsPush.forEach((_, index) => {
      console.log(`   - ${subtrees[index].name}`);
    });
    console.log(`\n   Run: bun run push:${needsPush.map((_, index) => subtrees[index].name).join(' && bun run push:')}`);
  }
  
  if (needsPull.length > 0) {
    console.log(`\n⬇️  Subtrees that need to be pulled:`);
    needsPull.forEach((_, index) => {
      console.log(`   - ${subtrees[index].name}`);
    });
    console.log(`\n   Run: bun run pull:${needsPull.map((_, index) => subtrees[index].name).join(' && bun run pull:')}`);
  }
  
  if (upToDate.length > 0) {
    console.log(`\n✅ Up to date subtrees:`);
    upToDate.forEach((_, index) => {
      console.log(`   - ${subtrees[index].name}`);
    });
  }
  
  if (errors.length > 0) {
    console.log(`\n❌ Subtrees with errors:`);
    errors.forEach((_, index) => {
      console.log(`   - ${subtrees[index].name}`);
    });
  }
  
  if (needsPush.length === 0 && needsPull.length === 0 && hasUncommitted.length === 0 && errors.length === 0) {
    console.log('\n🎉 All subtrees are up to date!');
  }
}

if (require.main === module) {
  main();
} 