<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const buckets = ref([])
const error = ref('')

async function fetchBuckets() {
  try {
    const response = await axios.get('http://localhost:5050/api/s3/buckets')
    buckets.value = response.data.buckets
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to load S3 buckets.'
  }
}

onMounted(fetchBuckets)
</script>

<template>
  <main style="padding: 16px;">
    <h1>S3 Buckets</h1>
    <p v-if="error" style="color: red;">{{ error }}</p>

    <table v-if="buckets.length > 0" border="1" cellpadding="8">
      <thead>
        <tr>
          <th>Bucket Name</th>
          <th>Creation Date</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="bucket in buckets" :key="bucket.name">
          <td>{{ bucket.name }}</td>
          <td>{{ bucket.creationDate }}</td>
        </tr>
      </tbody>
    </table>

    <p v-else-if="!error">No S3 buckets found.</p>
  </main>
</template>