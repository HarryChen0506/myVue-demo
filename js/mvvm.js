
// mvvvm构造函数
function Mvvm(opts){
    this.$opts = opts || {};
    var data = this._data = this.$opts.data;
    //数据进行代理
    this.proxy(data);
    //对data进行defineProperty 劫持getter和setter属性
    observe(data,this);  
    this.$compile = new Compile(this.$opts.el || document.body, this);   
}
Mvvm.prototype = {
    proxy: function (data){
        var self = this;
        Object.keys(data).forEach(function (key){
            //代理 从_data到vm中
            self._proxyData(key);
        })
    },
    _proxyData: function (key){
        var self = this;  
        Object.defineProperty(this,key,{
            enumerable: true, // 可枚举
            configurable: false, // 不能再define
            get: function (){
                //只有在object.DefineProperty的回掉函数里，才能调用 getter和setter
                //  console.log(123);
                // var val = self._data[key];
                // console.log(456);
                // console.log('proxy_get:'+self._data[key]);
                return self._data[key];
            },
            set: function (newVal){
                if(newVal === self._data[key]){
                    return 
                }
                //  console.log('proxy_set--'+'val:'+self._data[key]+'--newVal:'+newVal);
                 self._data[key] = newVal; 
            }
        })
    }
}



//observe 函数
function observe(data,vm){
    if(!data || typeof data !=='object'){
        return false;
    }
    return new Observer(data);
}
function Observer(data){
    this.data = data;
    this.walk();
}
Observer.prototype = {
    walk: function (){
        var self = this;
        var data = this.data;
        Object.keys(data).forEach(function (key){
            self.defineReactive(data,key,data[key]);
        })
    },
    defineReactive: function (data, key, val){
        var self = this;
        //若val是对象，则递归进行监听
        var childObj = observe(val);
        Object.defineProperty(data,key,{
            enumerable: true, // 可枚举
            configurable: false, // 不能再define
            get: function (){
                // console.log('get:'+val);
                return val;
            },
            set: function (newVal){
                if(newVal === val){
                    return 
                }
                 console.log('set--'+'val:'+val+'--newVal:'+newVal);
                 val = newVal;
                 //若新值是对象，则继续监听
                 childObj = observe(newVal); 
            }
        })
    }
}

//compile 编译
function Compile(el,vm){
    this.$vm = vm;
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);
    //解析指令和模型
    if(this.$el){
        //将node转换成虚拟fragement
        this.$fragment = this.node2fragment(this.$el);
        // 初始化 内部将遍历所有的子节点
        this.init();
        this.$el.appendChild(this.$fragment);
    }
}
Compile.prototype = {
    node2fragment:function (el){
        var fragment = document.createDocumentFragment();
        while(el.firstChild){
            fragment.appendChild(el.firstChild)
        }
        return fragment;
    },
    init: function (){
        this.compileElemnt(this.$fragment);
    },
    compileElemnt: function (fragment){
        var self = this;
        //表达式的  正则
        var reg = /\{\{(.*)\}\}/;
        //遍历所有子节点 获取attr
        [].slice.call(fragment.childNodes).forEach(function (node){
            var text = node.textContent;
            if(self.isTextNode(node) && reg.test(text)){
                //文本节点  
                var exp = RegExp.$1;             
                // console.log('text:'+node.textContent);
                // console.log(RegExp.$1);                
                self.compileText(node,exp);
            }else if(self.isElementNode(node)){
                //元素节点
                console.log('node:'+node.nodeName+node.textContent);
                self.compileNode(node);
            }
            //递归 如果node有子节点 继续compile

            if(node.childNodes && node.childNodes.length ){
                self.compileElemnt(node);
            }

        })
    },
    compileText: function (node,exp){
        Compile.Util.text(node,this.$vm,exp);
    },
    compileNode: function (node){
        var self = this;
        var attrs = node.attributes;
        [].forEach.call(attrs,function(item,index){
             //item.name  指令名称
            //item.value 指令的值
            var attrName = item.name;
            var dirName = attrName.slice(2);
            var exp = item.value;           
            if(self.isDirective(attrName,dirName)){
               
                // 指令是事件
                if(self.isEventDirective(dirName)){
                    Compile.Util.eventHandler(node,self.$vm,dirName,exp);
                }else{
                //指令是普通属性
                    
                }
            }
           
        })
        
    },
    isElementNode: function (node){        
        return node.nodeType && node.nodeType == 1       
    },
    isTextNode: function (node){
        return node.nodeType && node.nodeType == 3       
    },
    isDirective: function (attrName,dirName){              
        return attrName.indexOf('v-') ==0
    },
    isEventDirective: function (dirName){
        return dirName.indexOf('on') ==0
    }
}
Compile.Util = {
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },
    eventHandler: function (node,vm,dirName,exp){
        //注册事件
        var eventType = dirName.split(':')[1];
        // console.log('事件名',eventType);
        // console.log('表达式',exp);
        //事件主体
        var eventFn = vm.$opts.methods && vm.$opts.methods[exp];
        if( eventType && eventFn){
             node.addEventListener(eventType,eventFn.bind(vm),false);
        }       
    },
    bind: function(node, vm, exp, dir){
        var self = this;
        // console.log('bind')
        // console.log('node',node)
        // console.log('vm',vm)
        // console.log('exp',exp)
        // console.log('dir',dir)
        var updaterFn = Compile.updater[dir+'Updater'];
        updaterFn && updaterFn(node,self._getVmValue(vm,exp));
    },
    _getVmValue: function (vm,exp){
        console.log(exp);
        var val = vm;
        exp.split('.').forEach(function(item){
            val = val[item]
        })
        return val;
    }
}
Compile.updater = {
    textUpdater: function (node,val){
        node.textContent = typeof val =='undefined'?'':val;
    }
}