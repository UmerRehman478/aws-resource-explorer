<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const functions = ref([])
const error = ref('')

async function fetchFunctions() {
  try {
    const response = await axios.get('http://localhost:5050/api/lambda/functions')
    functions.value = response.data.functions
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to load Lambda functions.'
  }
}

onMounted(fetchFunctions)
</script>

<template>
  <main style="padding: 16px;">
    <h1>Lambda Functions</h1>
    <p v-if="error" style="color: red;">{{ error }}</p>

    <table v-if="functions.length > 0" border="1" cellpadding="8">
      <thead>
        <tr>
          <th>Function Name</th>
          <th>Runtime</th>
          <th>Memory (MB)</th>
          <th>Last Modified</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="fn in functions" :key="fn.name">
          <td>{{ fn.name }}</td>
          <td>{{ fn.runtime }}</td>
          <td>{{ fn.memory }}</td>
          <td>{{ fn.lastModified }}</td>
        </tr>
      </tbody>
    </table>

    <p v-else-if="!error">No Lambda functions found.</p>
  </main>
</template>