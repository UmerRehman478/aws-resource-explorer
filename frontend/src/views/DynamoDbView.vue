<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const tables = ref([])
const error = ref('')

async function fetchTables() {
  try {
    const response = await axios.get('http://localhost:5050/api/dynamodb/tables')
    tables.value = response.data.tables
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to load DynamoDB tables.'
  }
}

onMounted(fetchTables)
</script>

<template>
  <main style="padding: 16px;">
    <h1>DynamoDB Tables</h1>
    <p v-if="error" style="color: red;">{{ error }}</p>

    <table v-if="tables.length > 0" border="1" cellpadding="8">
      <thead>
        <tr>
          <th>Table Name</th>
          <th>Status</th>
          <th>Item Count</th>
          <th>Region</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="table in tables" :key="table.name">
          <td>{{ table.name }}</td>
          <td>{{ table.region }}</td>
          <td>{{ table.itemCount }}</td>
        </tr>
      </tbody>
    </table>

    <p v-else-if="!error">No tables found.</p>
  </main>
</template>