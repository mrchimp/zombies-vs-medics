<script setup lang="ts">
import { ref } from "vue";

const props = defineProps(["label", "modelValue", "min", "max", "step"]);
const emit = defineEmits(["update:modelValue"]);

function onInput(e: InputEvent) {
  emit("update:modelValue", (<HTMLInputElement>e.target).value);
}
</script>

<template>
  <div>
    <label for="medicCount" class="control-label">
      <div>{{ props.label }}</div>
      <div>{{ props.modelValue }}</div>
    </label>
    <input
      class="control-input"
      type="range"
      :min="props.min"
      :max="props.max"
      :step="props.step"
      :value="props.modelValue"
      @input="onInput"
    />
  </div>
</template>

<style>
.control-input {
  width: 100%;
}
.control-label {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
}
</style>
