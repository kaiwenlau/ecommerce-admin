<script setup lang="ts">
defineProps<{
  title: string
  description: string
  confirmLabel: string
  color: 'error' | 'warning' | 'neutral'
  warning?: string
  loading?: boolean
  serverError?: string
  deleteDisabled?: boolean
}>()

const emit = defineEmits<{ confirm: [] }>()

// `v-model:open` on the caller.
// The modal never closes itself — the caller closes it once its request succeeded.
const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
  >
    <template
      v-if="warning || serverError"
      #body
    >
      <div class="space-y-3">
        <UAlert
          v-if="warning"
          color="warning"
          variant="subtle"
          icon="i-lucide-info"
          :description="warning"
        />
        <UAlert
          v-if="serverError"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :description="serverError"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          color="neutral"
          variant="ghost"
          :disabled="loading"
          @click="open = false"
        >
          Cancel
        </UButton>
        <UButton
          :color="color"
          :loading="loading"
          :disabled="deleteDisabled"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
