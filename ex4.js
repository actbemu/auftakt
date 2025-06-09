/*
【ex4】2025/06/02　ex3.jsを元に開発
*/
/********** 本スクリプトの目的・成果 ***************
実装版のプロトタイプ
カンバスは動指標エリアと拍子エリアに。
拍子、テンポの指定は変数定義のところで手作業のまま。
拍子、テンポの指定で所望の表示と動きができるか
フェルマータ動作（停止後のアウフタクトからの起動）の確認

2025/06/03 10:47 1拍子の動き→ＯＫ
****************************************************/


//----- グローバル変数の宣言・定義 ----------------------
//変数のスコープを配慮し、initの外側で宣言だけしておく
let canvas;	//動指標が動くcanvas
let ctx;	//インスタンス
let raf;	//request animation frameのインスタンス（停止するときに指定するため）
let ball;	//動指標オブジェクト

//各種ステータスフラグ（動作コントロール用）
let moving=false;	//動作中かどうか
let oscActive=false;	//オシレータ起動中か
let fstop = false;	//直後の拍点で停止させるためのフラグ

//タイムスタンプ
let baseTimeStamp;	//[msec]単位
let lastClickTimeStamp;
let nextClickTimeStamp;

//メトロノームの基本パラメータ
let MM = 140;	//メトロノームのテンポ
let Beat = 3;	//拍子
const minMM = 10;	//最小テンポ
const maxMM = 210;	//最大テンポ
const maxBeat = 6;	//拍子最大値	

let beatTick = MM2beatTick(MM);	//周期[msec]

function MM2beatTick(mm){
	return 60 * 1000 / mm;
}

//レイアウト関連（動指標動作範囲など）
let maxH;	//指標打ち上げ最高点のmax
let xx0;	//1拍目のx座標
let xpitch;	//拍点のx座標間隔
let xxU, xxD;	//跳ね上げ点と着地点のx座標
let Beat_idx = 0; //拍位置のインデクス


//クリックサウンド関連オブジェクトの初期化
//DOMにアクセスしないのでここで初期化可能
const cLen = 0.05;		//クリック音の長さ[sec]
let sdelay = -0.0;		//サウンドタイミング調整用
const context = new AudioContext();
const osc = context.createOscillator();
const gain = context.createGain();
// 1200Hz: 敢えてドレミの音階から外れた周波数（参考サイトより）
osc.frequency.value = 1200;
// 最初は音を消しておく
gain.gain.value = 0;
//接続: osc => gain => dest.
osc.connect(gain).connect(context.destination);
//実際のオシレータ開始は、画面タップStart時1回のみ。
//発音はgainでコントロールするため、ブラウザを閉じるまで発振し続ける。


//----- DOM関連初期化処理：DOM要素がロードされた後に呼ばれる-----
function init(){
	canvas = document.getElementById("canvas");
	ctx = canvas.getContext("2d");

	//動指標のオブジェクトを作る
	ball = {
	  x: 100,
	  y: 100,
	  vx:17,
	  vy: 23,
	  radius: 20,
	  color: "blue",
	  draw(x,y) {
	    ctx.beginPath();
	    ctx.arc(x, y, this.radius, 0, Math.PI * 2, true);
	    ctx.closePath();
	    ctx.fillStyle = this.color;
	    ctx.fill();
	  },
	};
	//拍点座標の計算
	xpitch = canvas.width / Beat;
	xx0 = xpitch/2;
	
	
	//初期化の際はアウフタクト位置に指標を置く
	Beat_idx = Beat - 1;
	xxU = xx0 + Beat_idx * xpitch;
	xxD = xx0;
	ball.draw(xxU, canvas.height - ball.radius);
	

	//カンバス内クリックでStart/Stop操作
	canvas.addEventListener("click", (e) => {
		if(moving){	//Stop
			moving = false;
			fstop = true;	//次の拍点で停止させる
		}else{		//Start
			//オシレータ開始（この段階で音量は０）
			//ユーザ操作の後にスタートさせる必要がある
			if(!oscActive){	//初回クリック時のみの処理
				osc.start();
				oscActive = true;
				//オシレータ開始時のタイムスタンプを基準にする
				baseTimeStamp = performance.now() - context.currentTime * 1000;
			}
			//現在時刻を拍点時刻にする
			lastClickTimeStamp = currentTimeStamp();
			//次の拍点時刻
			nextClickTimeStamp = lastClickTimeStamp + beatTick;

			//アニメーション起動
			Beat_idx = Beat - 1;	//アウフタクトのインデクス
			xxU = xx0 + Beat_idx * xpitch;	//跳ね上げ点
			xxD = xx0;						//着地点
			Beat_idx = 0;
			//console.log('アウフタクト：' + xxU + 'to' + xxD);
	  		raf = window.requestAnimationFrame(drawMark);
	  		
	  		//次の拍点でのクリックサウンドを予約
	  		nextClickTime = timeStampToAudioContextTime(nextClickTimeStamp);
		    gain.gain.setValueAtTime(1, nextClickTime + sdelay);
		    gain.gain.linearRampToValueAtTime(0, nextClickTime + sdelay + cLen);
	  		moving = true;
	  		fstop = false;	//どちらか片方でも良い？
	  	}
	});
}

//---- 関数など --------------------------------------
/*****************
■Request Animation Frameの際に呼ばれる処理
*/
function drawMark() {
	//■描画エリアの消去（クリア）
	ctx.clearRect(0, 0, canvas.width, canvas.height);//カンバス内全面クリア
	
	//■現時点での位置に描画
	//直前の拍点のタイムスタンプtB0(lastClickTimeStamp)からの経過時間に基づいてy座標を決める。
	/*
	現在時刻tc、直前の拍点時刻tB0、周期Tから t を求め、正規放物線の式より y を求める。x, yは指標の正規化座標
		t=(tc-tB0)/T
		y=-4t*(t-1)

	実際の座標への変換
		XX=XB0+t*(XB1-XB0)  
		YY=Y0-y*H

		XB0発射点xxU、XB1着地点xxDは拍点のスクリーン座標
	拍点のスクリーン座標は配列に入れておき、拍点インデックスで引き出せば良い。
	Y0は最下点のスクリーン座標
	*/

	//■正規化座標	
	const t = (currentTimeStamp() - lastClickTimeStamp)/beatTick;
	const y = -4 * t * (t - 1);
	
	//console.log(x + " " + y);
	let maxH =  (canvas.height - 2*ball.radius);
	if(MM > 120){ maxH = (1-(MM - 120)/200) * maxH;}  //テンポが早い場合の高さ制限
	//console.log('maxH：'+maxH);
	ball.draw(xxU + t * (xxD - xxU), (canvas.height - ball.radius) - y * maxH);
	
	//■次の描画の予約（お決まりの手続き）
	raf = window.requestAnimationFrame(drawMark);

	//拍点処理
	if(nextClickTimeStamp <= currentTimeStamp()){
		if(Beat_idx < (Beat - 1)){Beat_idx++;}else{Beat_idx = 0;}

		//console.log("■拍点" + Beat_idx);
		xxU = xxD;	//現在の着地点はそのまま次の発射点になる
		xxD = xx0 + Beat_idx * xpitch;
		//console.log(xxU + 'to' + xxD);

		if(fstop){	//ストップ操作直後の拍点
			//アニメーション停止
			window.cancelAnimationFrame(raf);
			//描画エリアの消去（クリア）
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			//指標を拍点に置く
			ball.draw(xxU, canvas.height - ball.radius);			

		}else{	//通常の拍点の場合
			//■次のサウンドの予約
			//console.log('■次のサウンドの予約beatTick = '+beatTick);
			// スケジュール済みクリックの時刻を更新
			lastClickTimeStamp = nextClickTimeStamp;
			//console.log("スケジュール済みクリックの時刻を更新");
			nextClickTimeStamp += beatTick;	//[msec]単位
			//console.log('nextClickTimeStamp = '+nextClickTimeStamp);
			//予約時間をループで使っていたDOMHighResTimeStampからAudioContext向けに変換
			const nextClickTime = timeStampToAudioContextTime(nextClickTimeStamp);

			// 変換した時刻を使ってクリックサウンドを予約
			gain.gain.setValueAtTime(1, nextClickTime + sdelay);
			gain.gain.linearRampToValueAtTime(0, nextClickTime + sdelay + cLen);
		}
	}
}

/*****************
//currentTimeをDOMHighResTimeStampに変換して返す
*/
function currentTimeStamp() {
  return baseTimeStamp + context.currentTime * 1000;
}

/*****************
// 逆にDOMHighResTimeStampをcurrentTime形式に変換して返す
//次のサウンドの予約に使う
*/
function timeStampToAudioContextTime(timeStamp) {
  return (timeStamp - baseTimeStamp) / 1000;
}

//--------お決まりの作法-----------------------
//■DOM要素がロード完了してから初期化
window.addEventListener("load", init);


