/**
 * Kaspersky stamps `bis_skin_checked` onto DOM nodes before React hydrates —
 * including Next.js's hidden metadata wrapper, which we cannot mark with
 * suppressHydrationWarning. Block that attribute until hydration has finished.
 */
export const STRIP_EXTENSION_HYDRATION_ATTRS_SCRIPT = `(function(){
  var ATTR="bis_skin_checked";
  var origSet=Element.prototype.setAttribute;
  Element.prototype.setAttribute=function(name,value){
    if(String(name).toLowerCase()===ATTR) return;
    return origSet.apply(this,arguments);
  };
  function clean(el){
    if(el&&el.removeAttribute) el.removeAttribute(ATTR);
  }
  function walk(root){
    if(!root) return;
    if(root.nodeType===1) clean(root);
    if(!root.querySelectorAll) return;
    var nodes=root.querySelectorAll("["+ATTR+"]");
    for(var i=0;i<nodes.length;i++) clean(nodes[i]);
  }
  walk(document.documentElement);
  var obs=new MutationObserver(function(muts){
    for(var i=0;i<muts.length;i++){
      var m=muts[i];
      if(m.type==="attributes") clean(m.target);
      for(var j=0;j<m.addedNodes.length;j++) walk(m.addedNodes[j]);
    }
  });
  obs.observe(document.documentElement,{
    subtree:true,
    childList:true,
    attributes:true,
    attributeFilter:[ATTR]
  });
  function stop(){
    walk(document.documentElement);
    obs.disconnect();
    Element.prototype.setAttribute=origSet;
  }
  window.addEventListener("load",function(){ setTimeout(stop,2500); });
})();`;
