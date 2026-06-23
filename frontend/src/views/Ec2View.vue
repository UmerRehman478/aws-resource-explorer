<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const instances = ref([])
const error = ref('')

async function fetchInstances() {
  try {
    const response = await axios.get('http://localhost:5050/api/ec2/instances')
    instances.value = response.data.instances
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to load EC2 instances.'
  }
}

onMounted(fetchInstances)
</script>

<template>
  <main style="padding: 16px;">
    <h1>EC2 Instances</h1>
    <p v-if="error" style="color: red;">{{ error }}</p>

    <table v-if="instances.length > 0" border="1" cellpadding="8">
      <thead>
        <tr>
          <th>Instance ID</th>
          <th>State</th>
          <th>Type</th>
          <th>Region</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="instance in instances" :key="instance.id">
          <td>{{ instance.id }}</td>
          <td>{{ instance.state }}</td>
          <td>{{ instance.type }}</td>
          <td>{{ instance.region }}</td>
        </tr>
      </tbody>
    </table>

    <p v-else-if="!error">No EC2 instances found.</p>
  </main>
</template>