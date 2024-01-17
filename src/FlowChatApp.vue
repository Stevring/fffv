<script setup lang="ts">
import type { Elements } from '@vue-flow/core'  
import { MarkerType, Position, VueFlow } from '@vue-flow/core'
import type { Node, Edge } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { ref } from 'vue'
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { FilterGraphStringParser, FilterSegment, FilterChain, FilterParams, FilterPadParams} from './GraphParser'
import { ElMessage } from 'element-plus'

// import SpecialNode from './components/SpecialNode.vue'
// import SpecialEdge from './components/SpecialEdge.vue'

interface FilterNode extends Node {
  inputs: any[],
  outputs: any[]
}

interface FilterInOut {
  padLabel: string,
  filterNode: FilterNode,
  padIdx: number
}

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
let autoInsertedPadCount = 0

function findLinkLabel(seg: FilterSegment, label: string, findOutput: boolean): [FilterParams | undefined, number] {
  console.log(`find ${findOutput ? "output" : "input"} with pad ${label}`)
  for (const chain of seg.chains) {
    for (const filterParam of chain.filterParams) {
      console.log(`iterate ${filterParam.filterName}`)
      let pads = (findOutput) ? filterParam.outputPads : filterParam.inputPads
      for (let i = 0; i < pads.length; ++i) {
        if (pads[i].label === label) {
          console.log(`find label at ${i}`)
          return [filterParam, i]
        }
      }
    }
  }
  console.log(`no pad found`)
  return [undefined, 0]
}

function linkInputs(seg: FilterSegment, chainIdx: number, filterIdx: number,  openInputs: FilterInOut[], filterParam2Node: Map<FilterParams, FilterNode>) {
  let filterParam = seg.chains[chainIdx].filterParams[filterIdx]
  let filterNode = filterParam2Node.get(filterParam)!
  console.log(`link inputs for ${filterParam.filterName}`)
  filterParam.inputPads.forEach((pad, padIdx) => {
    if (filterNode.inputs[padIdx] !== undefined) {
      console.log(`${filterParam.filterName} input[${padIdx}] already connected`)
      return;
    }
    let [connectFilterParam, connectPadIdx] = findLinkLabel(seg, pad.label, true)
    if (connectFilterParam !== undefined) {
      linkFilters(filterParam2Node, connectFilterParam, connectPadIdx, filterParam, padIdx, pad.label)
    }
  })

  // if there's no input pad specified for the filter,
  // and it is not the first one in the filter chain,
  //  we assume its has one input, which is connected to the first input of its previous filter

  if (filterParam.inputPads.length == 0 && filterIdx >= 1) {
    let padLabel = `auto-pad-${autoInsertedPadCount++}`
    // create input pad for this filter
    filterParam.inputPads.push(new FilterPadParams(padLabel))
    let previousFilterParam = seg.chains[chainIdx].filterParams[filterIdx - 1]
    if (previousFilterParam.outputPads.length == 0) {
      // create one output pad for previous filter
      previousFilterParam.outputPads.push(new FilterPadParams(padLabel))
    }
    linkFilters(filterParam2Node, previousFilterParam, 0, filterParam, 0, "") // omit auto pad label name
  }
}

function linkOutputs(seg: FilterSegment, chainIdx: number, filterIdx: number,  openInputs: FilterInOut[], filterParam2Node: Map<FilterParams, FilterNode>) {
  let filterParam = seg.chains[chainIdx].filterParams[filterIdx]
  let filterNode = filterParam2Node.get(filterParam)!
  console.log(`link outputs for ${filterParam.filterName}`)
  filterParam.outputPads.forEach((pad, padIdx) => {
    if (filterNode.outputs[padIdx] !== undefined) {
      console.log(`${filterParam.filterName} output[${padIdx}] already connected`)
      return
    }
    let [connectFilterParam, connectPadIdx] = findLinkLabel(seg, pad.label, false)
    if (connectFilterParam !== undefined) {
      linkFilters(filterParam2Node, filterParam, padIdx, connectFilterParam, connectPadIdx, pad.label)
    }
  })

  // if there's no output pad specified for the filter,
  // and it is not the last one in the filter chain,
  //  we assume its has one output, which is connected to the first input of its next filter

  if (filterParam.outputPads.length == 0 && filterIdx < seg.chains[chainIdx].filterParams.length - 1) {
    let padLabel = `auto-pad-${autoInsertedPadCount++}`
    // create input pad for this filter
    filterParam.outputPads.push(new FilterPadParams(padLabel))
    let nextFilterParam = seg.chains[chainIdx].filterParams[filterIdx + 1]
    if (nextFilterParam.inputPads.length == 0) {
      // create one output pad for previous filter
      nextFilterParam.inputPads.push(new FilterPadParams(padLabel))
    }
    linkFilters(filterParam2Node, filterParam, 0, nextFilterParam, 0, "") // omit auto pad label name
  }
}

function linkFilters(filterParam2Node: Map<FilterParams, FilterNode>, srcFilter: FilterParams, srcPadIdx: number, dstFilter: FilterParams, dstPadIdx: number, label: string) {
  let srcNode = filterParam2Node.get(srcFilter)!
  let dstNode = filterParam2Node.get(dstFilter)!
  let padName = srcFilter.outputPads[srcPadIdx].label
  let edge = {
    id: padName,
    label: label,
    source: srcNode.id,
    target: dstNode.id,
    markerEnd: MarkerType.ArrowClosed,
    animated: true,
    sourceNode: srcNode,
    targetNode: dstNode
  }
  srcNode.outputs[srcPadIdx] = edge
  dstNode.inputs[dstPadIdx] = edge
}

function calculateLayout(inputNodes: FilterNode[]) {
  const ySpace = 100
  const xSpace = 250
  console.log(inputNodes)

  let previousChainBottom = 0

  // return bottom most position
  function visitNode(node: FilterNode, x: number, y: number): number {
    node.position = {x: x, y: y}
    const outputNodes = node.outputs.flatMap((e) => {
      return e.targetNode === undefined ? [] : e.targetNode
    })
    console.log(outputNodes)
    for (const outputNode of outputNodes) {
      y = visitNode(outputNode, x + xSpace, y) + ySpace
    }
    return outputNodes.length > 0 ? y - ySpace : y
  }

  for (const inputNode of inputNodes) {
    previousChainBottom = visitNode(inputNode, 50, previousChainBottom + ySpace)
  }
}

function convertDescToGraph(e: EventTarget) {
  console.log(e)
  let parser = new FilterGraphStringParser(graphDesc.value);
  let graphSegment: FilterSegment
  try {
    graphSegment = parser.parseSegment()
    console.log(graphSegment)
  } catch (error) {
    console.log(error)
    ElMessage.error((error as Error).message)
    // handle error
    return
  }

  // create node for each filter
  let filter2Count: Map<string, number> = new Map() // used to assign id for each node
  let filter2Node: Map<FilterParams, FilterNode> = new Map()
  graphSegment.chains.forEach((chain) => {
    chain.filterParams.forEach((filterParam) => {
      let count = 0
      if (filter2Count.has(filterParam.filterName)) {
        count = (filter2Count.get(filterParam.filterName) as number) + 1
      }
      filter2Count.set(filterParam.filterName, count)
      let id = `${filterParam.filterName}_${count}`
      let node = {
        id: id,
        position: {x: 0, y: 0},
        label: filterParam.filterName,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        inputs: Array(filterParam.inputPads.length),
        outputs: Array(filterParam.outputPads.length)
      }
      filter2Node.set(filterParam, node)
    })
  })
  
  // create edge for each filter connection
  let openInputs: FilterInOut[] = []
  let openOutputs: FilterInOut[] = []
  graphSegment.chains.forEach((chain, chainIdx) => {
    chain.filterParams.forEach((filter, filterIdx) => {
      let filterNode = filter2Node.get(filter)!
      if (filterNode === undefined)
        return
      linkInputs(graphSegment, chainIdx, filterIdx, openInputs, filter2Node)
      linkOutputs(graphSegment, chainIdx, filterIdx, openOutputs, filter2Node)
    })
  })
  

  // grab all nodes & edges
  let allElements: any[] = []
  let allInputNode: FilterNode[] = []
  filter2Node.forEach((node, key) => {
    allElements.push(node)
    if (node.inputs.filter((i, idx, array) => {
      return i !== undefined
    }).length == 0) {
      node.type = "input"
      allInputNode.push(node)
    }
    if (node.outputs.filter((o, idx, array) => {
      return o !== undefined
    }).length == 0) {
      node.type = "output"
    }
    allElements.push(...node.outputs)
  })

  // layout
  calculateLayout(allInputNode)

  elements.value = allElements
  console.log(allElements)
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
          <Background pattern-color="#aaa" :gap="8" />
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