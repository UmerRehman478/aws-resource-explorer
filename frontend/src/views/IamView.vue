<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const users = ref([])
const roles = ref([])
const error = ref('')

async function fetchIamData() {
  try {
    const response = await axios.get('http://localhost:5050/api/iam/users')
    users.value = response.data.users
    roles.value = response.data.roles
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to load IAM data.'
  }
}

onMounted(fetchIamData)
</script>

<template>
  <main style="padding: 16px;">
    <h1>IAM Users and Roles</h1>
    <p v-if="error" style="color: red;">{{ error }}</p>

    <h2>Users</h2>
    <table v-if="users.length > 0" border="1" cellpadding="8">
      <thead>
        <tr>
          <th>User Name</th>
          <th>Created Date</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.name">
          <td>{{ user.name }}</td>
          <td>{{ user.createdDate }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!error">No IAM users found.</p>

    <h2>Roles</h2>
    <table v-if="roles.length > 0" border="1" cellpadding="8">
      <thead>
        <tr>
          <th>Role Name</th>
          <th>Created Date</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="role in roles" :key="role.name">
          <td>{{ role.name }}</td>
          <td>{{ role.createdDate }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!error">No IAM roles found.</p>
  </main>
</template>