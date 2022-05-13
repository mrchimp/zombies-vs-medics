<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps([
  "label",
  "modelValue",
  "min",
  "max",
  "step",
  "title",
  "type",
]);
const emit = defineEmits(["update:modelValue"]);

function onInput(e: InputEvent) {
  emit("update:modelValue", (<HTMLInputElement>e.target).value);
}

const classes = computed(() => {
  switch (props.type) {
    case "medic":
      return "highlight-medic";
    case "zombie":
      return "highlight-zombie";
    case "civilian":
      return "highlight-civilian";
    default:
      return "highlight-regular";
  }
});
</script>

<template>
  <div :class="classes">
    <label for="medicCount" class="control-label" :title="title">
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
.highlight-medic input {
  accent-color: var(--medic-color);
}
.highlight-zombie input {
  accent-color: var(--zombie-color);
}
.highlight-civilian input {
  accent-color: var(--civilian-color);
}
.highlight-regular input {
  accent-color: #666;
}
</style>
