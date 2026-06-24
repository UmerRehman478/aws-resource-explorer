<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const vpcs = ref([])
const subnets = ref([])
const securityGroups = ref([])
const error = ref('')

async function fetchVpcData() {
  try {
    const response = await axios.get('http://localhost:5050/api/vpc/list')
    vpcs.value = response.data.vpcs
    subnets.value = response.data.subnets
    securityGroups.value = response.data.securityGroups
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to load VPC data.'
  }
}

onMounted(fetchVpcData)
</script>

<template>
  <main style="padding: 16px;">
    <h1>VPCs, Subnets, and Security Groups</h1>
    <p v-if="error" style="color: red;">{{ error }}</p>

    <h2>VPCs</h2>
    <table v-if="vpcs.length > 0" border="1" cellpadding="8">
      <thead><tr><th>VPC ID</th><th>CIDR Block</th><th>Is Default</th></tr></thead>
      <tbody>
        <tr v-for="vpc in vpcs" :key="vpc.id">
          <td>{{ vpc.id }}</td><td>{{ vpc.cidrBlock }}</td><td>{{ vpc.isDefault }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!error">No VPCs found.</p>

    <h2>Subnets</h2>
    <table v-if="subnets.length > 0" border="1" cellpadding="8">
      <thead><tr><th>Subnet ID</th><th>VPC ID</th><th>CIDR Block</th><th>Availability Zone</th></tr></thead>
      <tbody>
        <tr v-for="subnet in subnets" :key="subnet.id">
          <td>{{ subnet.id }}</td><td>{{ subnet.vpcId }}</td><td>{{ subnet.cidrBlock }}</td><td>{{ subnet.availabilityZone }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!error">No subnets found.</p>

    <h2>Security Groups</h2>
    <table v-if="securityGroups.length > 0" border="1" cellpadding="8">
      <thead><tr><th>Group ID</th><th>Name</th><th>VPC ID</th><th>Description</th></tr></thead>
      <tbody>
        <tr v-for="sg in securityGroups" :key="sg.id">
          <td>{{ sg.id }}</td><td>{{ sg.name }}</td><td>{{ sg.vpcId }}</td><td>{{ sg.description }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!error">No security groups found.</p>
  </main>
</template>