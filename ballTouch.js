//touchObjID是触摸对象的ID,rotateObj是旋转对象的ID
function earthTouch(touchObjID,rotateObjID){
  this.touchObjID = touchObjID;
  this.rotateObjID = rotateObjID;
  this.startX = null;//表示开始触摸时候的x坐标
  this.startY = null;//表示开始触摸时候的y坐标
  this.lastRotateDeg=0;//保存上一次旋转的角度
  this.lastRotateDegCopy=0;//lastRotateDeg的拷贝对象
  this.centerX = document.documentElement.clientWidth/2;//旋转的中心点
  this.centerY = document.documentElement.clientWidth/2;//旋转的中心点
  this.lineK = 0;//内部直线的斜率
  this.lineB = 0;//内部直线的B值
  this.touchMoveTime = 0;//保存滑动时候的时间
  this.touchMoveDeg;//保存滑动时候的角度(相对开始触摸时候)
  this.touchActuallyMoveDeg;//保存滑动相对于上次滑动的距离（相对上一次滑动）
  this.touchMoveDerection;//保存滑动的方向 0表示逆时针 1表示顺时针
  this.touchMoveSpeed = 0;//表示滑动速度
  this.dragForce = 0.01//设置阻力为每秒1度
  this.rotateInertiaLastTimes;//因为惯性旋转是根据requestAnimationFrame来实现的,所以这里面我需要记录每次requestAnimationFrame的间隔时间,所以这个是保存上次requestAnimationFrame执行rotateInertia方法的时间
  this.rotateInertiaTotalDgreen = 0;//因为每次旋转的时候都是计算出下次要转的角度,但是我每次旋转是从初始角度旋转的,所以这个需要加上上次的角度,这个变量主要用来存放上次的角度
  this.compareMoveTime = 20;//这个主要用来控制停留多少时间以内算用户意图使用惯性旋转
  this.compareMoveDgreen = 2;//因为有时候用户是手指按在屏幕上了,然后松开 好不进行惯性旋转,但是有时候用户的手不安分啊 他非要小小的挪动一下,这个就是规避用户挪动手指造成的误差
  this.RFAID;//这个就是requestAnimationFrameID
}
//初始化
earthTouch.prototype.init = function(){
  var _this = this;
  document.getElementById(this.touchObjID).addEventListener("touchstart",function(event){
    event.preventDefault();
    event.stopPropagation();
    var event = event || window.event;
    var touch = event.changedTouches[0];
    if(_this.touchMoveSpeed != 0){
      //清除上次惯性旋转的数据
      _this.touchMoveSpeed = 0;
      _this.lastRotateDeg = _this.lastRotateDegCopy
      _this.rotateInertiaTotalDgreen = 0
    }
    //保存初始点位置
    _this.startX = touch.clientX;
    _this.startY = touch.clientY;
    //计算直线
    _this.lineCalculate(_this.startX,_this.startY,_this.centerX,_this.centerY)
  },false);
  document.getElementById(this.touchObjID).addEventListener("touchmove",function(event){
    event.stopPropagation();
    var event = event || window.event;
    var touch = event.changedTouches[0];
    var currentDeg = _this.getTouchDeg(touch);
    currentDeg = _this.lastRotateDeg + currentDeg;
    currentDeg = Math.abs(currentDeg)
    //计算滑动速度
    _this.touchActuallyMoveDeg = Math.abs(currentDeg-_this.touchMoveDeg)
    _this.touchMoveSpeed = _this.touchActuallyMoveDeg/(new Date() - _this.touchMoveTime)//计算出一毫秒钟转动多少度
    //计算旋转方向
    if(typeof(_this.touchMoveDeg) != "undefined"){
      if(_this.touchMoveDeg < currentDeg){
        _this.touchMoveDerection = 1;
      }else{
        _this.touchMoveDerection = 0;
      }
    }
    $("#"+_this.rotateObjID).css({"-webkit-transform":"translate(-50%,-50%) rotate("+currentDeg+"deg)","transform":"translate(-50%,-50%) rotate("+currentDeg+"deg)"})
    _this.touchMoveDeg = currentDeg;//记录上次移动角度
    _this.touchMoveTime = new Date();//记录结束时候时间
  },false);
  document.getElementById(this.touchObjID).addEventListener("touchend",function(event){
    event.stopPropagation();
    var event = event || window.event;
    var touch = event.changedTouches[0];
    _this.lastRotateDeg = _this.lastRotateDeg + _this.getTouchDeg(touch);
    if(window.fps < 24){
      _this.compareMoveTime = 200
    } else if (window.fps < 50) {
      _this.compareMoveTime = 100
    } else{
      _this.compareMoveTime = 20
    }
    if((new Date() - _this.touchMoveTime) < _this.compareMoveTime && _this.touchActuallyMoveDeg > _this.compareMoveDgreen){
      //惯性滚动
      if(_this.touchMoveSpeed > 1){
        _this.touchMoveSpeed = 1;
      }
      if(_this.touchMoveSpeed < 0.5 ){
        _this.touchMoveSpeed = 0.5;
      }
      if(_this.touchMoveDerection == 0){
        _this.rotateInertiaTotalDgreen = 360000
      }else{
        _this.rotateInertiaTotalDgreen = 0
      }
      _this.rotateInertia()
    }
  },false);
}
//获取触摸角度
earthTouch.prototype.getTouchDeg = function(touch){
  var moveX = touch.clientX
  var moveY = touch.clientY
  var pointPosition = this.pointPositionCalculate({x:moveX,y:moveY})
  var side1 = Math.sqrt(Math.pow((this.centerX-this.startX),2)+Math.pow((this.centerY-this.startY),2))//左边
  var side2 = Math.sqrt(Math.pow((this.centerX-moveX),2)+Math.pow((this.centerY-moveY),2))//右边
  var side3 = Math.sqrt(Math.pow((this.startX-moveX),2)+Math.pow((this.startY-moveY),2))//对边
  var cosA = (Math.pow(side1,2)+Math.pow(side2,2)-Math.pow(side3,2))/(2*side1*side2)//余弦定理

  cosA = Math.acos(cosA)/3.14*180//反余弦定理
  if(pointPosition == false){
    if(this.lineK > 0){
      if(this.startY < this.centerY){
        cosA = 360-cosA;
      }
    }else{
      if(this.startY > this.centerY){
        cosA = 360-cosA;
      }
    }
  }else{
    if(this.lineK > 0){
      if(this.startY > this.centerY){
        cosA = 360-cosA;
      }
    }else{
      if(this.startY < this.centerY){
        cosA = 360-cosA;
      }
    }
  }
  return cosA;
}
//计算直线公式
earthTouch.prototype.lineCalculate = function(x1,y1,x2,y2){
  this.lineK = (y1-y2)/(x1-x2);
  this.lineB = y1-this.lineK*x1;
}
//判断点在直线上方还是下方 true是上方,false是下方
earthTouch.prototype.pointPositionCalculate = function(point){
  return point.y < (this.lineK*point.x+this.lineB);
}
//惯性旋转
earthTouch.prototype.rotateInertia = function(){
  this.RFAID = RAF(this.rotateInertia.bind(this));
  this.touchMoveSpeed = this.touchMoveSpeed - this.dragForce;//速度逐渐降低
  if(!!this.rotateInertiaLastTimes == false){
    this.rotateInertiaLastTimes = new Date()
    return;
  }
  var degreen = (new Date()-this.rotateInertiaLastTimes) * this.touchMoveSpeed;
  if(this.touchMoveDerection == 0){
    this.rotateInertiaTotalDgreen = this.rotateInertiaTotalDgreen - degreen
  }else{
    this.rotateInertiaTotalDgreen = this.rotateInertiaTotalDgreen + degreen
  }
  var currentDeg = this.lastRotateDeg +  this.rotateInertiaTotalDgreen;
  if(this.touchMoveSpeed <= 0){
    cancelAnimationFrame(this.RFAID)
    return;
  }
  this.lastRotateDegCopy = currentDeg;
  $("#"+this.rotateObjID).css({"-webkit-transform":"translate(-50%,-50%) rotate("+currentDeg+"deg)","transform":"translate(-50%,-50%) rotate("+currentDeg+"deg)"})
  this.rotateInertiaLastTimes = new Date()
}
