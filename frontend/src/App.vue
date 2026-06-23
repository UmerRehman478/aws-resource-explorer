<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <nav style="padding: 16px; border-bottom: 1px solid #ccc;">
    <RouterLink to="/" style="margin-right: 16px;">Home</RouterLink>
    <RouterLink to="/ec2" style="margin-right: 16px;">EC2</RouterLink>
    <RouterLink to="/s3" style="margin-right: 16px;">S3</RouterLink>
    <RouterLink to="/lambda" style="margin-right: 16px;">Lambda</RouterLink>
    <RouterLink to="/iam" style="margin-right: 16px;">IAM</RouterLink>
    <RouterLink to="/vpc" style="margin-right: 16px;">VPC</RouterLink>
    <RouterLink to="/dynamodb">DynamoDB</RouterLink>
  </nav>

  <RouterView />
</template>