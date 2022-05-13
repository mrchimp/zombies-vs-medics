<script setup lang="ts">
import { ref } from "vue";
const show = ref(false);
const props = defineProps(["label"]);
function toggle() {
  show.value = !show.value;
}
</script>

<template>
  <fieldset
    class="group-fieldset"
    :class="show ? 'group-fieldset--active' : ''"
  >
    <button class="group-title-bar" type="button" @click.prevent="toggle">
      <h2 class="group-title">{{ props.label }}</h2>
      <div
        class="group-down-arrow"
        :class="show ? 'group-down-arrow--active' : ''"
      >
        &#129147;
      </div>
    </button>
    <div v-show="show" class="group-content">
      <slot />
    </div>
  </fieldset>
</template>

<style scoped>
.group-fieldset {
  margin: 1rem 0;
}
.group-fieldset--active {
  margin-bottom: 1rem;
}
.group-title-bar {
  align-items: center;
  background: none;
  border: none;
  color: #fff;
  display: flex;
  justify-content: space-between;
  line-height: 1;
  padding: 0;
  width: 100%;
}
.group-title {
  font-size: 1rem;
  margin: 0;
}
.group-down-arrow {
  font-size: 1.5rem;
  transform: rotate(-90deg);
  transition: transform 0.2s ease-out;
}
.group-down-arrow--active {
  transform: rotate(0deg);
}
.group-content {
  padding: 1rem 0 0;
}
</style>
