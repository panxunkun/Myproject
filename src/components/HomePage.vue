<template>
  <div class="main" v-model="GetKBJSON">
    <el-input v-model="Input" placeholder="输入查询内容" class="input_text" @keyup.enter.native="GetResult"></el-input>
    <el-table :data="TableData" border class="output_table">
      <template v-for="item in TableHead">
        <TableHeadConfig v-if="item.children&&item.children.length>0" :model="item"></TableHeadConfig>
        <el-table-column v-else  :key="item.name" :label="item.name" :prop="item.dataIndex"  >
        </el-table-column>
      </template>
    </el-table>
  </div>
</template>

<script>
    import {jsonPath} from "../../static/jsonpath"
    import TableHeadConfig from './TabelHeadConfig.vue';
    let jp = require("jsonpath");
    let JSONObject = new Array();
    let NodeId=0;
    export default {
        components:{
          TableHeadConfig
        },
        data(){
            return {
              Input: '',
              RelaxationJOSN: '',
              FuzzyTermJSON: '',
              NodeRelaxJSON: '',
              NodeImportanceJSON:'',
              DataJSON: '',
              TableData: [],
              TableHead: [],
              Res: []
        }

        },
        methods:{
            //获取用户输入的模糊查询
            FindJsonKey:function (json,parentId) {

                let current;
                if(Object.prototype.toString.call(json)==='[object Object]'&&Object.prototype.toString.call(json)!=='[object String]'&&Object.prototype.toString.call(json)!=='[object Number]'){
                    for( let i in json){
                        let obj1={};
                        current=NodeId++;
                        obj1.ID=current;
                        obj1.Node=i;
                        obj1.parentID=parentId;
                        JSONObject.push(obj1);
                        this.FindJsonKey(json[i],current);
                    }
                }
                else if(Object.prototype.toString.call(json)==='[object Array]'&&Object.prototype.toString.call(json)!=='[object String]'&&Object.prototype.toString.call(json)!=='[object Number]'){
                    for(let j in json[0]){
                        let obj2={};
                        current=NodeId++;
                        obj2.ID=current;
                        obj2.Node=j;
                        obj2.parentID=parentId;
                        JSONObject.push(obj2);

                        if(Object.prototype.toString.call(json[0][j])==='[object Object]'&&Object.prototype.toString.call(json[0][j])!=='[object String]'&&Object.prototype.toString.call(json[0][j])!=='[object Number]'){

                            this.FindJsonKey(json[0][j],current);
                        }
                        if(Object.prototype.toString.call(json[0][j])==='[object Array]'&&Object.prototype.toString.call(json[0][j])!=='[object String]'&&Object.prototype.toString.call(json[0][j])!=='[object Number]'){

                            if(Object.prototype.toString.call(json[0][j][0])==='[object String]'){
                                continue;
                            }
                            this.FindJsonKey(json[0][j],current);
                        }
                    }
                }
            },
            FindInRelaxationJSON:function (NodeName,QueryType) {
                let jsonExp='$["Relaxation"]["relax"][?(@["leaf_node"]=="'+NodeName+'"&&@["operator"]=="'+QueryType+'")]';
                let Direction_Satisfaction=this.QueryInJSON(this.RelaxationJOSN,jsonExp);
                console.log(Direction_Satisfaction);
                return Direction_Satisfaction;
            },
            FindInFuzzyTermJSON:function(NodeName,QueryNumber){
                let FuzzyTerms=[];
                let jsonExp;
                if(QueryNumber===undefined){
                    jsonExp='$["FuzzyTerm"]["fterm"][?(@["leaf_node"]=="'+NodeName+'")]';
                }
                else{
                    jsonExp='$["FuzzyTerm"]["fterm"][?(@["leaf_node"]=="'+NodeName+'"&&@["fuzzy_term"]=="'+QueryNumber[0]+'")]'
                }

                FuzzyTerms=this.QueryInJSON(this.FuzzyTermJSON,jsonExp);
                console.log(FuzzyTerms);
                return FuzzyTerms;
            },
            FindInNodeRelaxJSON:function(NodeName){
                let jsonExp='$["NodeRelax"]["nrelax"][?(@["leaf_node"]=="'+NodeName+'")]';
                let Noderelax=this.QueryInJSON(this.NodeRelaxJSON,jsonExp);

                return Noderelax;
            },
            FindNodeImportanceJSON:function(NodeName,nimp) {
               let jsonExp = '$["NodeImportance"]["nimportance"][?(@["leaf_node"]=="' + NodeName + '"&&@["nimp"]=="'+nimp+'")]';
               let nodeImportance = this.QueryInJSON(this.NodeImportanceJSON, jsonExp);
               return nodeImportance;
             },
            QueryInJSON:function (js,jsonExp) {
                let RetureQueryResult = jp.query(js,jsonExp);
                return RetureQueryResult;
            },
            GetResult(){

                //显示初始化
                this.TableData=[];
                this.TableHead=[];
                this.Res=[];


                //处理模糊条件
                let QueryArray=new Array();
                QueryArray=this.Input.split('，');
                let Exact_Check=new RegExp("(是|为)");
                let Close_Check=new RegExp("(接近|临近)");
                let Most_Check=new RegExp("(最多|至多|顶多|不超过)");
                let Least_Check=new RegExp("(最少|至少)");
                let Section_Check=new RegExp("(~|之间)");
//              let Number_Check=new RegExp("[+-]?(0|([1-9]\d*))(\.\d+)?","g");
                let Number_Check=new RegExp("[0-9]+","g");
                let FuzzyNumber_Check=new RegExp("(多|少|近|远|轻|重|低|高)","g");// FuzzyTerm
                let Very_Check=new RegExp("(非常)");// very
                let More_or_Less_Check = new RegExp("(较)");//more or less;
//              let Not_Check=new RegExp("[/不]");

                //查询条件处理
                for(let QueryNum=0;QueryNum<QueryArray.length;QueryNum++){
                    let Query={};
                    Query.Contain=QueryArray[QueryNum].replace(/\d+/g,);
                    if(Close_Check.test(QueryArray[QueryNum])===true){
                        Query.QueryType="close to";
                    }
                    else if(Most_Check.test(QueryArray[QueryNum])===true){
                        Query.QueryType="at most";
                    }
                    else if(Least_Check.test(QueryArray[QueryNum])===true){
                        Query.QueryType="at least";
                    }
                    else if(Section_Check.test(QueryArray[QueryNum])===true){
                        Query.QueryType="between";
                    }
                    else{
                        Query.QueryType="query";
                    }
                    let num=QueryArray[QueryNum].match(Number_Check);
                    let fuzzy_num=QueryArray[QueryNum].match(FuzzyNumber_Check);

                    if(num!==null){
                          Query.QueryNumber=num;
                          Query.NumberType="number"
                    }
                    else if(fuzzy_num!==null){
                          Query.QueryNumber=fuzzy_num;
                          Query.NumberType="fuzzy";
                        if(Very_Check.test(QueryArray[QueryNum])===true){
                          Query.FuzzyDegree="very";
                        }
                        else if(More_or_Less_Check.test(QueryArray[QueryNum])===true){
                          Query.FuzzyDegree="more or less";
                        }
                        else{
                          Query.FuzzyDegree="normal";
                        }
                    }
                    else if(Exact_Check.test(QueryArray[QueryNum])===true){
                          let Exact=QueryArray[QueryNum].split('是');
                          Query.QueryType="exact";
                          let ExactObject=[];
                          ExactObject.push(Exact[1]);
                          Query.QueryNumber=ExactObject;
                          console.log(ExactObject);
                    }

                    QueryArray[QueryNum]=Query;
                }
                console.log(QueryArray);
                let json=new Array();

                //本地JSON文件模拟访问后台JSON文件
                this.$http.get('./static/JSONData.json').then(response => {
                //this.$http.get('./static/1.json').then(response => {
                    //json字符串转换成json对象
                    this.DataJSON=response.data;

                    this.FindJsonKey(this.DataJSON,0);
                    let jsonObject=[];
                    jsonObject=JSONObject;
                    //表头以及JSON结构处理
                    let TableIndexArray=[];
                    for(let i=0;i<jsonObject.length;i++) {
                      let Children = [];
                      for (let j = i + 1; j < jsonObject.length; j++) {
                        if (jsonObject[i].ID === jsonObject[j].parentID) {
                          Children.push(jsonObject[j]);
                        }
                      }

                      //叶子节点到根节点的路径
                      let ParentNode1 = [];
                      let ParentNode2 = []
                      let LeafPath;
                      let Secparent = [];//次根父节点


                      let TableIndex = []; //表头
                      TableIndex.name = jsonObject[i].Node;
                      if (Children.length === 0) {
                        jsonObject[i].NodeType = "LeafNode";
                        LeafPath = '["' + jsonObject[i].Node + '"]'
                        let dataIndex = '.' + jsonObject[i].Node;  //表头dataIndex
                        for (let j = 0; j < jsonObject.length; j++) {
                          if (jsonObject[i].parentID === jsonObject[j].ID) {
                            ParentNode1 = jsonObject[j];
                            ParentNode2 = jsonObject[j];
                          }
                        }
                        while (ParentNode1.ID !== 0) {
                          Secparent = ParentNode1;
                          //LeafPath='["'+ParentNode.Node+'"]'+LeafPath;
                          for (let k = 0; k < jsonObject.length; k++) {
                            if (ParentNode1.parentID === jsonObject[k].ID) {
                              ParentNode1 = jsonObject[k];
                            }
                          }
                        }
                        while (ParentNode2.ID !== Secparent.ID) {
                          LeafPath = '["' + ParentNode2.Node + '"]' + LeafPath;
                          dataIndex = '.' + ParentNode2.Node + dataIndex;
                          for (let k = 0; k < jsonObject.length; k++) {
                            if (ParentNode2.parentID === jsonObject[k].ID) {
                              ParentNode2 = jsonObject[k];
                            }
                          }
                        }
                        jsonObject[i].SecParent = Secparent.Node;
                        jsonObject[i].NodePath = LeafPath;
                        TableIndex.dataIndex = dataIndex;
                      }
                      else {
                        jsonObject[i].NodeType = "Node";
                        TableIndex.dataIndex = ""
                      }
                      jsonObject[i].Children = Children;
                      TableIndex.children = [];
                      TableIndexArray.push(TableIndex);
                    }
                    //将用户输入的查询条件转换成 操作数与操作关系
                    for(let i=0; i<QueryArray.length;i++){
                        for(let j=0;j<jsonObject.length;j++){

                            if(QueryArray[i].Contain.indexOf(jsonObject[j].Node)>=0){
                                QueryArray[i].JSONLocation=jsonObject[j];
                            }
                        }
                    }

                    //查询条件处理以及进行模糊查询扩展
                    for(let i=0;i<QueryArray.length;i++){
                        if(QueryArray[i].NumberType==="number"){
                            QueryArray[i].Operator="==";
                            continue;
                        }
                        if(QueryArray[i].QueryType==="exact"){
                            QueryArray[i].Operator="==";
                            continue;
                        }
                        //隶属函数形状确定
                        let System_a_cut=0.8;
                        let NodeRelax=[];
                        NodeRelax=this.FindInNodeRelaxJSON(QueryArray[i].JSONLocation.Node);
                        let Mdegree=this.FindNodeImportanceJSON(QueryArray[i].JSONLocation.Node,NodeRelax[0].nimp);
                        let Weight=Mdegree[0].mdegree;
                        if(QueryArray[i].QueryType==="at most"){
                            let degrel;
                            let Direction_and_Satisfaction=this.FindInRelaxationJSON(QueryArray[i].JSONLocation.Node,QueryArray[i].QueryType);
                            if(Direction_and_Satisfaction[0].directionrel==="right"){
                                degrel=Direction_and_Satisfaction[0].rdegrel;
                            }
                            let ExtendNumber=Number(QueryArray[i].QueryNumber)*(Number(degrel)*(1-Number(System_a_cut))+1);
                            QueryArray[i].Operator="<=";
                            QueryArray[i].QueryNumber=ExtendNumber;
                        }
                        if(QueryArray[i].QueryType==="at least"){
                            let degrel;
                            let Direction_and_Satisfaction=this.FindInRelaxationJSON(QueryArray[i].JSONLocation.Node,QueryArray[i].QueryType);
                            if(Direction_and_Satisfaction[0].directionrel=== "left"){
                                degrel=Direction_and_Satisfaction[0].ldegrel;
                            }
                            let ExtendNumber=Number(QueryArray[i].QueryNumber)*(Number(degrel)*(Number(System_a_cut)-1)+1);
                            QueryArray[i].Operator= ">=";
                            QueryArray[i].QueryNumber=ExtendNumber;
                        }
                        if(QueryArray[i].QueryType==="close to"){
                            let Direction_and_Satisfaction=this.FindInRelaxationJSON(QueryArray[i].JSONLocation.Node,QueryArray[i].QueryType);
                            let ldegrel=Direction_and_Satisfaction[0].ldegrel;
                            let rdegrel=Direction_and_Satisfaction[0].rdegrel;
                            let ExtendNumber=[];
                            let Operator=[">=","<="];
                            // Fuzzy Degree
                            let A_cut;
                            if(QueryArray[i].FuzzyDegree==="very"){
                                A_cut=Math.sqrt(Number(System_a_cut));
                            }
                            else if(QueryArray[i].FuzzyDegree==="more or less"){
                                A_cut=Math.pow(Number(System_a_cut),2);
                            }
                            else if(QueryArray[i].FuzzyDegree==="normal"){
                                A_cut=Number(System_a_cut);
                            }
                            if(Direction_and_Satisfaction[0].directionrel=== "left,right"){
                                ExtendNumber.push(Number(QueryArray[i].QueryNumber)*(1-Number(ldegrel)*Number(Math.sqrt((1-Number(A_cut))/Number(A_cut)))));
                                ExtendNumber.push(Number(QueryArray[i].QueryNumber)*(1+Number(rdegrel)*Number(Math.sqrt((1-Number(A_cut))/Number(A_cut)))));
                            }
                            else if(Direction_and_Satisfaction[0].directionrel=== "left"){
                                ExtendNumber.push(Number(QueryArray[i].QueryNumber)*(1-Number(ldegrel)*Number(Math.sqrt((1-Number(A_cut))/Number(A_cut)))));
                                ExtendNumber.push(Number(QueryArray[i].QueryNumber));
                            }
                            else if(Direction_and_Satisfaction[0].directionrel=== "right"){
                                ExtendNumber.push(Number(QueryArray[i].QueryNumber));
                                ExtendNumber.push(Number(QueryArray[i].QueryNumber)*(1+Number(rdegrel)*Number(Math.sqrt((1-Number(A_cut))/Number(A_cut)))));
                            }
                            QueryArray[i].QueryNumber=ExtendNumber;
                            QueryArray[i].Operator=Operator;
                        }
                        if(QueryArray[i].QueryType==="between"){
                            let fterm=[];
                            let Num=[];
                            let FindCheck=false;
                            let Y=QueryArray[i].QueryNumber;
                            fterm=this.FindInFuzzyTermJSON(QueryArray[i].JSONLocation.Node,undefined);
                            for(let j=0;j<fterm.length;j++){
                                console.log(fterm[j],Y);
                                if(Number(fterm[j].para[1])===Number(Y[0])&&Number(fterm[j].para[2])===Number(Y[1])){
                                    FindCheck=true;
                                    Num=fterm[j].para;
                                    break;
                                }
                            }
                            let a,b,c,d;
                            if(FindCheck===true){
                                a=Num[0];
                                b=Num[1];
                                c=Num[2];
                                d=Num[3];
                            }
                            else{
                                a=Number(Y[0])/(1+Number(System_a_cut));
                                b=Number(Y[0]);
                                c=Number(Y[1]);
                                d=Number(Y[1])*(1+Number(System_a_cut));
                            }
                            let S1=Number(a)+(Number(System_a_cut)+Number(Weight)-1)*(Number(b)-Number(a))/Number(Weight);
                            let S2=Number(d)+(1-Number(System_a_cut)-Number(Weight))*(Number(d)-Number(c))/Number(Weight);
                            console.log(S1,S2);
                            let ExtendNumber=[];
                            ExtendNumber.push(S1);
                            ExtendNumber.push(S2);
                            let Operator=[">=","<="];
                            QueryArray[i].QueryNumber=ExtendNumber;
                            QueryArray[i].Operator=Operator;
                            console.log(QueryArray[i]);
                            console.log(ExtendNumber);

                        }
                        if(QueryArray[i].QueryType==="query"){
                            if(QueryArray[i].NumberType==="fuzzy"){
                                let fterm=[];
                                fterm=this.FindInFuzzyTermJSON(QueryArray[i].JSONLocation.Node,QueryArray[i].QueryNumber);
                                console.log(fterm);
                                let a,b,c,d;
                                a=fterm[0].para[0];
                                b=fterm[0].para[1];
                                c=fterm[0].para[2];
                                d=fterm[0].para[3];
                                //  very     more or less
                                let S1,S2;
                                let B = (Number(System_a_cut)-1+Number(Weight))/Number(Weight);
                                let ExtendNumber=[];
                                let Operator=[">=","<="];
                                let Degree_B;
                                if(QueryArray[i].FuzzyDegree==="more or less"){
                                    Degree_B=Math.pow(Number(B),2);

                                }
                                else if(QueryArray[i].FuzzyDegree==="very"){
                                    Degree_B=Math.sqrt(Number(B));
                                }
                                else{
                                    Degree_B=Number(B);
                                }
                                S2=Number(d)-(Number(d)-Number(c))*Degree_B;
                                if(Number(a)>=0){
                                    S1=Number(a)+(Number(b)-Number(a))*Degree_B;
                                }
                                else{
                                    S1=0;
                                }
                                ExtendNumber.push(S1);
                                ExtendNumber.push(S2);
                                QueryArray[i].QueryNumber=ExtendNumber;
                                QueryArray[i].Operator=Operator;
                                console.log("ok")
                            }
                        }
                    }

                     //将 操作数与操作关系转换成 JSONPath表达式 （精确模式）
                    for(let i=0;i<QueryArray.length;i++){
                        let pathExp;
                        if(QueryArray[i].QueryNumber.length>1){
                            pathExp=QueryArray[i].JSONLocation.NodePath+QueryArray[i].Operator[0]+'"'+QueryArray[i].QueryNumber[0]+'"'+'&&@'+QueryArray[i].JSONLocation.NodePath+QueryArray[i].Operator[1]+'"'+QueryArray[i].QueryNumber[1]+'"';
                        }
                        else{
                            pathExp=QueryArray[i].JSONLocation.NodePath+QueryArray[i].Operator+'"'+QueryArray[i].QueryNumber+'"'
                        }
                        QueryArray[i].PathExp=pathExp;


                    }

                    //获取JSONPath查询的表达式
                    let pathExpression='$["'+jsonObject[0].Node+'"]["'+QueryArray[0].JSONLocation.SecParent+'"][?('+'@'+QueryArray[0].PathExp;
                    for(let i=1;i<QueryArray.length;i++){
                        pathExpression+='&&@'+QueryArray[i].PathExp;
                    }
                    pathExpression+=')]';
                    console.log(pathExpression);

                    //JSONPath查询并返回结果
                    let result =this.QueryInJSON(this.DataJSON,pathExpression);
                    for(let i=jsonObject.length-1;i>0;i--){
                        TableIndexArray[jsonObject[i].parentID].children.push(TableIndexArray[jsonObject[i].ID]);
                    }
                    this.TableHead.push(TableIndexArray[0]);
                    this.TableData=result;

                    //缓存初始化
                    JSONObject.splice(0,JSONObject.length);
                    jsonObject.splice(0,jsonObject.length);
                    NodeId=0;



                }, response => {
                    console.log('get DataJSON fail !');
                })


            }
        },
        computed:{
            GetKBJSON: function(){
                this.$http.get('/static/Relaxation.json').then(response =>{
                    this.RelaxationJOSN=response.data;
                    console.log(this.RelaxationJOSN);

                },response =>{
                     console.log("get NodeRelaxJSON fail");
                });
                this.$http.get('/static/FuzzyTerm.json').then(response => {
                    this.FuzzyTermJSON = response.data;
                    console.log(this.FuzzyTermJSON);
                },response => {
                    console.log("get FuzzyTermJSON fail");
                });
                this.$http.get('/static/NodeRelax.json').then(response => {
                    this.NodeRelaxJSON = response.data;
                    console.log(this.NodeRelaxJSON);
                },response => {
                    console.log("get RelaxationJOSN fail");
                });
                this.$http.get('/static/NodeImportance.json').then(response => {
                this.NodeImportanceJSON = response.data;
                   console.log(this.NodeImportanceJSON);
                },response => {
                   console.log("get NodeImportanceJSON fail");
                });
            }
        }
    }
</script>

<style>
  .main{
    width: 100%;
    height: 100%;
    position:absolute;
  }
  .input_text{
    width: 50%;
    top:30%
  }
  .output_table{
    width: 80%;
    position:absolute;
    top:40%;
    left: 10%;
  }
</style>
