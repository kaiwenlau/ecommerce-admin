<script setup lang="ts">
/**
 * One form, two pages — `/products/new` and `/products/[id]/edit`.
 *
 * The parent owns the request.
 * This component owns the fields, the client-side validation and the red text,
 * and hands the typed values back on submit.
 */

import type { Form, FormError } from '@nuxt/ui'
import { CENTS_PER_UNIT } from '#shared/constants'
import { PRODUCT_STATUSES, productCreateSchema } from '#shared/schemas/product'
import type { ProductCreateInput } from '#shared/schemas/product'

const props = defineProps<{
  /**
   * The row being edited, already serialised by `useFetch`. Absent when creating.
   */
  initial?: {
    sku: string
    name: string
    description: string | null
    category: string
    priceCents: number
    stock: number
    status: ProductCreateInput['status']
  }
  submitLabel: string
  pending?: boolean
}>()

const emit = defineEmits<{ submit: [values: ProductCreateInput] }>()

/**
 * Seed the form with the initial values, or empty strings for a new product.
 *
 * The state is `z.input`, so priceCents is string data type.
 */
const state = reactive<ProductCreateInput>({
  sku: props.initial?.sku ?? '',
  name: props.initial?.name ?? '',
  description: props.initial?.description ?? '',
  category: props.initial?.category ?? '',
  priceCents: props.initial ? (props.initial.priceCents / CENTS_PER_UNIT).toFixed(2) : '', // inverse of `parseCents` and show 2dp
  stock: props.initial?.stock ?? 0,
  status: props.initial?.status ?? 'draft',
})

const form = useTemplateRef<Form<ProductCreateInput>>('form')

const statusItems = PRODUCT_STATUSES.map(value => ({ label: value, value }))

/**
 * Emits the raw `state`, not the submit event's `data`.
 * - raw state: what the user literally typed - string `"19.99"`.
 * - submit event's data: the same values after Zod ran - number `1999`.
 *
 * `POST /api/products` runs same schema and expects the string format.
 * The price is parsed exactly once, on the server.
 */
const onSubmit = () => {
  emit('submit', { ...state })
}

/**
 * Displays server-side error message under the matching field. Called by the parents' `catch`.
 *
 * @param errors Output of `toFormErrors()`
 */
const setErrors = (errors: FormError[]) => {
  form.value?.setErrors(errors)
}

defineExpose({ setErrors })
</script>

<template>
  <UForm
    ref="form"
    :schema="productCreateSchema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
  >
    <!-- `name` must match schema key exactly - connect `setErrors()` to the field box. -->
    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField
        label="SKU"
        name="sku"
        required
      >
        <UInput
          v-model="state.sku"
          placeholder="SKU-001"
          class="w-full"
          autofocus
        />
      </UFormField>

      <UFormField
        label="Name"
        name="name"
        required
      >
        <UInput
          v-model="state.name"
          placeholder="Blue Shirt"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Category"
        name="category"
        required
      >
        <UInput
          v-model="state.category"
          placeholder="Shirts"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Status"
        name="status"
        required
      >
        <USelect
          v-model="state.status"
          :items="statusItems"
          value-key="value"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Price"
        name="priceCents"
        required
        help="Up to 2 decimal places."
      >
        <UInput
          v-model="state.priceCents"
          placeholder="19.99"
          inputmode="decimal"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Stock"
        name="stock"
        required
      >
        <UInputNumber
          v-model="state.stock"
          :min="0"
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField
      label="Description"
      name="description"
    >
      <UTextarea
        v-model="state.description"
        :rows="4"
        class="w-full"
      />
    </UFormField>

    <div class="flex items-center gap-3">
      <UButton
        type="submit"
        :loading="pending"
      >
        {{ submitLabel }}
      </UButton>
      <UButton
        to="/products"
        color="neutral"
        variant="ghost"
      >
        Cancel
      </UButton>
    </div>
  </UForm>
</template>
