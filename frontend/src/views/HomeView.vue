<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const roleArn = ref('')
const message = ref('')
const isError = ref(false)
const router = useRouter()

async function handleAssumeRole() {
  message.value = ''
  isError.value = false

  try {
    const response = await axios.post('http://localhost:5050/api/assume-role', {
      roleArn: roleArn.value,
    })
    message.value = 'Role assumed successfully! You can now browse the AWS resources.'
    isError.value = false
  } catch (err) {
    message.value = err.response?.data?.error || 'Something went wrong.'
    isError.value = true
  }
}
</script>

<template>
  <main>
    <h1>AWS Resource Explorer</h1>
    <p>Enter an AWS Role ARN below to explore resources in that account.</p>

    <input
      v-model="roleArn"
      type="text"
      placeholder="arn:aws:iam::123456789012:role/YourRoleName"
      style="width: 400px; padding: 8px;"
    />
    <button @click="handleAssumeRole" style="padding: 8px 16px; margin-left: 8px;">
      Assume Role
    </button>

    <p v-if="message" :style="{ color: isError ? 'red' : 'green' }">
      {{ message }}
    </p>
  </main>
</template>