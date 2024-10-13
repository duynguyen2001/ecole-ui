<script lang="ts">
  let page = 1;
</script>

<div>
  <h1 class="title">Annotations</h1>
  <p>Page {page}</p>
  <button on:click={() => page += 1}>Next page</button>
</div>

<style>
  .title {
    font-size: 2rem;
    margin-bottom: 1rem;
  }
</style>