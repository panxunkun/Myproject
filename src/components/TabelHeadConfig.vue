<template>
  <el-table-column  v-if="isFolder" :key="model.name" :label="model.name" :prop="model.dataIndex" >
    <template v-for="item in model.children">
      <tableColumn v-if="item.children && item.children.length" :model="item"></tableColumn>
      <el-table-column v-else  :key="item.name" :label="item.name" :prop="item.dataIndex">
      </el-table-column>
    </template>
  </el-table-column>
  <el-table-column v-else :key="model.name" :label="model.name" :prop="model.dataIndex" ></el-table-column>
</template>

<script>
  export default {
    name: 'tableColumn',
    props: ['model'],
    computed: {
      isFolder() {
        return this.model.children && this.model.children.length;
      }
    }
  }
</script>
