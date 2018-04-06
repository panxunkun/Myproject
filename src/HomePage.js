<template>
    <div class="main" v-model="GetKBJSON">
        <el-input v-model="Input" placeholder="输入查询内容" class="input_text" @keyup.enter.native="GetResult"></el-input>
</div>
</template>

<script>
import {jsonPath} from "../../static/jsonpath"
let jp = require("jsonpath");
let JSONObject = new Array();
let NodeId=0;
export default {
    data(){
        return {
            Input:'',
            RelaxationJOSN:'',
            FuzzyTermJSON:'',
            NodeRelaxJSON:''
        }
    },
    methods:{
        //获取用户输入的模糊查询
        FindJsonKey:function (json,parentId) {

            let current;
            if(Object.prototype.toString.call(json)==='[object Object]'){
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
            else {
                for(let j in json[0]){
                    let obj2={};
                    current=NodeId++;
                    obj2.ID=current;
                    obj2.Node=j;
                    obj2.parentID=parentId;
                    JSONObject.push(obj2);
                    //console.log(Object.prototype.toString.call(json[0][j]));
                    if(Object.prototype.toString.call(json[0][j])==='[object Object]'){
                        //console.log(jsonObject);
                        this.FindJsonKey(json[0][j],current);
                    }
                    if(Object.prototype.toString.call(json[0][j])==='[object Array]'){
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
            console.log(jsonExp);
            let Direction_Satisfaction=this.QueryInJSON(this.RelaxationJOSN,jsonExp);
            console.log(Direction_Satisfaction);
            return Direction_Satisfaction;
        },
        FindInFuzzyTermJSON:function(NodeName,QueryNumber){
            console.log(NodeName,QueryNumber);
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
            console.log(Noderelax);
            return Noderelax;
        },
        QueryInJSON:function (js,jsonExp) {
            let QueryResult = jp.query(js,jsonExp);
            return QueryResult;
        },
        GetResult(){
            //处理模糊条件
            let QueryArray=new Array();
            QueryArray=this.Input.split('，');
//            三种模糊关系的检测
//            1、 ( not) close to (around)
//            2、 ( not) at most
//            3、 ( not) at least
//
            let Close_Check=new RegExp("(接近|临近)");
            let Most_Check=new RegExp("(最多|至多|顶多|不超过)");
            let Least_Check=new RegExp("(最少|至少)");
            let Section_Check=new RegExp("(~|之间)");
            let Number_Check=new RegExp("[0-9]+","g");
            let FuzzyNumber_Check=new RegExp("(多|少|近|远|轻|重)");
            let Very_Check=new RegExp("(非常)");// very
            let More_or_Less_Check = new RegExp("(较)");//more or less;
            let Not_Check=new RegExp("[/不]");
            //查询条件处理
            for(let QueryNum=0;QueryNum<QueryArray.length;QueryNum++){
                let Query={};
                Query.Contain=QueryArray[QueryNum];
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
                    Query.NumberType="fuzzy"
                }
                if(Very_Check.test(QueryArray[QueryNum])===true){
                    Query.FuzzyDegree="very";
                }
                else if(More_or_Less_Check.test(QueryArray[QueryNum])===true){
                    Query.FuzzyDegree="more or less";
                }
                else{
                    Query.FuzzyDegree="normal";
                }
                QueryArray[QueryNum]=Query;
            }
            let js_string;
            let json=new Array();

            //本地JSON文件模拟访问后台JSON文件
            this.$http.get('/api/json_data').then(response => {
                //json字符串转换成json对象
                json.push(response.data.data);
                js_string=JSON.stringify(json);
                let js=JSON.parse(js_string);

                //console.log(js[0]);
                this.FindJsonKey(js[0],0);
                let jsonObject=[];
                jsonObject=JSONObject;
                //将用户输入的查询条件转换成 操作数与操作关系
                for(let i=0; i<QueryArray.length;i++){
                    for(let j=0;j<jsonObject.length;j++){
                        if(QueryArray[i].Contain.indexOf(jsonObject[j].Node)>=0){
                            QueryArray[i].JSONLocation=jsonObject[j];
                        }
                    }
                }

                //  （！！！此处进行模糊查询扩展！！！）
                for(let i=0;i<QueryArray.length;i++){
                    //隶属函数形状确定
                    let System_a_cut=0.8;
                    let Noderelax=this.FindInNodeRelaxJSON(QueryArray[i].JSONLocation.Node);
                    console.log(Noderelax);
                    let Weight;
                    if(Noderelax[0].nimp==="medium"){
                           Weight=0.5;
                    }
                    else if(Noderelax[0].nimp==="high"){
                           Weight=0.8;
                    }
                    console.log(Weight);
                        
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
                        if(Direction_and_Satisfaction[0].directionrel=== "left,right"){
                            ExtendNumber.push(Number(QueryArray[i].QueryNumber)*(1-Number(ldegrel)*Number(Math.sqrt((1-Number(System_a_cut))/Number(System_a_cut)))));
                            ExtendNumber.push(Number(QueryArray[i].QueryNumber)*(1+Number(rdegrel)*Number(Math.sqrt((1-Number(System_a_cut))/Number(System_a_cut)))));
                        }
                        else if(Direction_and_Satisfaction[0].directionrel=== "left"){
                            ExtendNumber.push(Number(QueryArray[i].QueryNumber)*(1-Number(ldegrel)*Number(Math.sqrt((1-Number(System_a_cut))/Number(System_a_cut)))));
                            ExtendNumber.push(Number(QueryArray[i].QueryNumber));
                        }
                        else if(Direction_and_Satisfaction[0].directionrel=== "right"){
                            ExtendNumber.push(Number(QueryArray[i].QueryNumber));
                            ExtendNumber.push(Number(QueryArray[i].QueryNumber)*(1+Number(rdegrel)*Number(Math.sqrt((1-Number(System_a_cut))/Number(System_a_cut)))));
                        }
                        QueryArray[i].QueryNumber=ExtendNumber;
                        QueryArray[i].Operator=Operator;
                    }
                    //  A between Y1  and  Y2
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
                    // 3
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
                    
                            if(QueryArray[i].FuzzyDegree==="more or less"){
                                S2=Number(d)-(Number(d)-Number(c))*Math.pow(Number(B),2);
                                if(Number(a)>=0){
                                    S1=Number(a)+(Number(b)-Number(a))*Math.pow(Number(B),2);
                                }
                                else{
                                    S1=0;
                                }
                            }
                            else if(QueryArray[i].FuzzyDegree==="very"){
                                S2=Number(d)-(Number(d)-Number(c))*Math.sqrt(Number(B));
                                if(Number(a)>=0){
                                    S1=Number(a)+(Number(b)-Number(a))*Math.sqrt(Number(B));
                                }
                                else{
                                    S1=0;
                                }
                            }
                            else{
                                S2=Number(d)-(Number(d)-Number(c))*B;
                                if(Number(a)>=0){
                                    S1=Number(a)+(Number(b)-Number(a))*B;
                                }
                                else{
                                    S1=0;
                                }
                            }
                            console.log(ExtendNumber);
                            ExtendNumber.push(S1);
                            ExtendNumber.push(S2);
                            QueryArray[i].QueryNumber=ExtendNumber;
                            QueryArray[i].Operator=Operator;
                        }
                    }
                }
                //将 操作数与操作关系转换成 JSONPath表达式 （精确模式）  //普通查询的Operator ==
                for(let i=0;i<QueryArray.length;i++){
                    let pathExp;
                    if(QueryArray[i].QueryNumber.length>1){
                        pathExp='["'+QueryArray[i].JSONLocation.Node+'"]'+QueryArray[i].Operator[0]+QueryArray[i].QueryNumber[0]+'&&@'+'["'+QueryArray[i].JSONLocation.Node+'"]'+QueryArray[i].Operator[1]+QueryArray[i].QueryNumber[1];
                    }
                    else{
                        pathExp='["'+QueryArray[i].JSONLocation.Node+'"]'+QueryArray[i].Operator+QueryArray[i].QueryNumber;
                    }
                    let ParentNode;
                    for(let j=0;j<jsonObject.length;j++){
                        if(QueryArray[i].JSONLocation.parentID===jsonObject[j].ID){
                            ParentNode=jsonObject[j];
                        }
                    }
                    while(ParentNode.ID!==1){
                        pathExp='["'+ParentNode.Node+'"]'+pathExp;
                        for(let k=0;k<jsonObject.length;k++){
                            if(ParentNode.parentID===jsonObject[k].ID){
                                ParentNode=jsonObject[k];
                            }
                        }
                    }
                    QueryArray[i].PathExp=pathExp;
                    //console.log(pathExp);
                }


                //获取JSONPath查询的表达式
                let pathExpression='$[0]["'+jsonObject[0].Node+'"]["'+jsonObject[1].Node+'"][?('+'@'+QueryArray[0].PathExp;
                for(let i=1;i<QueryArray.length;i++){
                    pathExpression+='&&@'+QueryArray[i].PathExp;
                }
                pathExpression+=')]';

                console.log(pathExpression);
                //JSONPath查询并返回结果
                let result =this.QueryInJSON(js,pathExpression);
                console.log(result);

            }, response => {
                console.log('数据加载失败')
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
                // let js_string=JSON.stringify(response2.data);
                //  this.FuzzyTermJSON=JSON.parse(js_string);
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
    margin:20%;
    width: 50%;
    margin-top: 20%;
    margin-left: 27%;
}
</style>
