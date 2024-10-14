<script lang="ts">
  import { onMount } from 'svelte';
  import ProfilDropDown from '$lib/components/ProfileDropDown.svelte'; 
  let username = 'User';
  
  onMount(() => {
    // Fetch user data or perform other initialization
  });
</script>

<main>
  <header>
    <h1 class="text-[4rem]">ECOLE-MIRACLE</h1>
    <div class="user-profile flex flex-row justify-center items-center content-center gap-[1rem]">
      <span>{username}</span>
      <ProfilDropDown />
    </div>
  </header>
  
  <div class="content">
    <nav>
      <ul>
        <li><button>Labels</button></li>
        <li><button>History</button></li>
        <li><button>Retrain</button></li>
        <li><button>Help</button></li>
      </ul>
    </nav>
    
    <section class="main-content">
      <!-- Main content will go here -->
      <slot></slot>
    </section>
  </div>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1rem;
    background-color: #f0f0f0;
    height: 50px;
  }
  
  .user-profile {
    display: flex;
    align-items: center;
  }
  
  .avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background-color: #ccc;
    margin-left: 0.5rem;
  }
  
  .content {
    display: flex;
    flex: 1;
  }
  
  nav {
    width: 200px;
    background-color: #e0e0e0;
    padding: 1rem;
  }
  
  nav ul {
    list-style-type: none;
    padding: 0;
  }
  
  nav li {
    margin-bottom: 0.5rem;
  }
  
  nav button {
    width: 100%;
    text-align: left;
    padding: 0.5rem;
    background-color: #d0d0d0;
    border: none;
    cursor: pointer;
  }
  
  .main-content {
    flex: 1;
    padding: 1rem;
  }
</style>