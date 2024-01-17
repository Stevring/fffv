<script setup lang="ts">
import type { Elements } from '@vue-flow/core'  
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { ref } from 'vue'
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { FilterGraphStringParser, FilterSegment, FilterChain, FilterParams} from './GraphParser'

// import SpecialNode from './components/SpecialNode.vue'
// import SpecialEdge from './components/SpecialEdge.vue'

const elements = ref<Elements>([
// nodes

// an input node, specified by using `type: 'input'`
{ id: '1', type: 'input', label: 'Node 1', position: { x: 250, y: 5 } },

// default node, you can omit `type: 'default'` as it's the fallback type
{ id: '2', label: 'Node 2', position: { x: 100, y: 100 }, },

// An output node, specified by using `type: 'output'`
{ id: '3', type: 'output', label: 'Node 3', position: { x: 400, y: 200 } },

// edges

// simple default bezier edge
// consists of an id, source-id and target-id
{ id: 'e1-3', source: '1', target: '3' },

// an animated edge, specified by using `animated: true`
{ id: 'e1-2', source: '1', target: '2', animated: true },

])
const graphDesc = ref('')

function convertDescToGraph(e: EventTarget) {
  console.log(e)
  let parser = new FilterGraphStringParser(graphDesc.value);
  try {
    let graphSegment = parser.parseSegment()
    console.log(graphSegment)
  } catch (error) {
    console.log(error)
  }
  
}

function convertGraphToDesc() {

}

</script>

<template>
  <div class="common-layout">
    <el-container style="height: 100vh;">
      <el-header>
        <el-row>
          <el-input v-model="graphDesc" placeholder="Please input complex filtergraph description" clearable />
        </el-row>
        <el-row>
          <el-button type="primary" :icon="ArrowDown" @click="convertDescToGraph" >Convert Description to Graph</el-button>
          <el-button type="primary" :icon="ArrowUp" @click="convertGraphToDesc" >Convert Graph to Description</el-button>
        </el-row>
      </el-header>
      <el-divider />
      <el-main>
        <VueFlow v-model="elements">
          <Background pattern-color="#aaa" gap="8" />
        </VueFlow>
      </el-main>
    </el-container>
  </div>
  
</template>

<style>
/* import the necessary styles for Vue Flow to work */
@import '@vue-flow/core/dist/style.css';

/* import the default theme, this is optional but generally recommended */
@import '@vue-flow/core/dist/theme-default.css';

.el-row, .el-header {
  margin-bottom: 20px;
}

</style>