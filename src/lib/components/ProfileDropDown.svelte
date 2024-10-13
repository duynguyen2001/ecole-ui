<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';

  interface Mode {
    name: string;
    icon: string;
    path: string;
    locked?: boolean;
  }

  let isOpen = false;
  let githubName = '';

  const modes = [
    { name: 'Annotator', icon: '□', path: '/annotator', default: true },
    { name: 'Knowledge Engineer', icon: '⚙', path: '/knowledge-engineer', locked: true },
    { name: 'Analyst', icon: '〰', path: '/analyst', locked: true }
  ];

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  function selectMode(mode: Mode) {
    if (!mode.locked) {
      navigate(mode.path);
      isOpen = false;
    }
  }

  onMount(async () => {
    // Fetch the GitHub name from your API or state management
    githubName = 'github_name'; // Replace with actual fetch logic
  });
</script>

<div class="profile-dropdown">
  <button on:click={toggleDropdown} class="profile-icon h-[2rem] w-[2rem] bg-black">
    <!-- Replace with actual profile icon -->
  </button>

  {#if isOpen}
    <div class="dropdown-menu">
      <div class="github-info">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <circle cx="12" cy="12" r="10" fill="currentColor" />
        </svg>
        <span>{githubName}</span>
      </div>
      {#each modes as mode}
        <button 
          on:click={() => selectMode(mode)}
          class="mode-option"
          class:locked={mode.locked}
        >
          <span class="mode-icon">{mode.icon}</span>
          {mode.name}
          {#if mode.locked}
            <span class="lock-icon">🔒</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .profile-dropdown {
    position: relative;
  }

  .profile-icon {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
    width: 200px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }

  .github-info {
    display: flex;
    align-items: center;
    padding: 8px;
    border-bottom: 1px solid #eee;
  }

  .github-info svg {
    margin-right: 8px;
  }

  .mode-option {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 8px;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
  }

  .mode-option:hover {
    background-color: #f0f0f0;
  }

  .mode-icon {
    margin-right: 8px;
  }

  .locked {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .lock-icon {
    margin-left: auto;
  }
</style>