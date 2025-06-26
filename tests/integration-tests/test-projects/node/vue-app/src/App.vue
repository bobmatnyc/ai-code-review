<template>
  <div id="app">
    <header>
      <h1>Vue.js Test App</h1>
    </header>
    <main>
      <div v-if="loading">Loading...</div>
      <ul v-else>
        <li v-for="item in items" :key="item.id">{{ item.name }}</li>
      </ul>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const items = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const response = await fetch('https://api.example.com/data');
    items.value = await response.json();
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin: 0;
  padding: 20px;
}

header {
  margin-bottom: 20px;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  margin: 10px 0;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
}
</style>