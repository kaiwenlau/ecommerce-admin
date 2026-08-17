<script setup lang="ts">
useHead({ title: 'Dashboard' })
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-semibold">
      Dashboard
    </h1>

    <UCard>
      <p class="text-sm text-muted">
        Coming soon. Analytics will be built on Day 5.
      </p>

      <template #footer>
        <UButton
          to="/products"
          trailing-icon="i-lucide-arrow-right"
        >
          Go to product page
        </UButton>
      </template>
    </UCard>
  </div>
</template>
