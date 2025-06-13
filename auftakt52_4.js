/*
【auftakt52.js】2025/06/12　auftakt52.jsを元に開発
*/
/************* 本スクリプトの目的・成果 ***************
htmlのscriptタグの中でdeferをつけたときの効果を確認。
　　→従来のようにloadedイベントを待たなくてもDOMが使えるようだ！

Wake Lockがリリースされたときの扱いを検討
リリースイベントが検知できるか
Wake Lockを再び設定できるか?
スマホで画面を別アプリにしたら、15秒で暗転。AuftaktにもどったらWake Lock ONになっていた。
動作としてはOK．ただし、メッセージが表示されない。

****************************************************/
//----- グローバル変数の宣言・定義 -----------------
let fdebug = false;
//公開URL　　CopyURLで使用　ＧＩＴＨＵＢにしてみる
//const baseURL = 'http://www1.vecceed.ne.jp/~bemu/auftakt/auftakt52_1.html';
const baseURL = 'https://actbemu.github.io/auftakt/auftakt52.html';

//変数のスコープを配慮し、initの外側で宣言だけしておく
let canvas;	//動指標が動くcanvas
let ctx;	//インスタンス
let beat_canvas;
let beat_context;
let raf;	//request animation frameのインスタンス（停止するときに指定するため）
let ball;	//動指標オブジェクト
let intervalID = 0;
//const ball_col = 'navy';   //ボールの色
//const ball_col = '#082752';   //ボールの色濃い藍
const ball_col = '#165e83';   //ボールの色 藍
const beat_col = '#dcd3b2';   //;拍数字の色; 砂色#dcd3b2
const beat_bgcol = '#250d00';  //拍子エリア背景色　黒檀#250d00
const mc_bgcol = '#fffffc';  //メインキャンバス　胡粉色 #fffffc

const divdot0_col = '#38b48b';  //分割時のドット
const divdot1_col = '#38b48b'; //分割時のドット#38b48b翡翠色
const cntdwn_col = '#b48a76';  //梅染 うめぞめ　　桜鼠 さくらねず#e9dfe5
const pie_color = '#b48a76';  //梅染 うめぞめ　　桜鼠 さくらねず#e9dfe5
const msg_col = '#e6b422';  //黄金 #e6b422
let ct0;    //カウントダウン開始タイムスタンプ
let raf_countdown;  //開始待機時のパイチャート表示アニメーションrequest animation frame

//各種ステータスフラグ（動作コントロール用）
let moving=false;	//動作中かどうか
let oscActive=false;	//オシレータ起動中か
let fstop = false;	//直後の拍点で停止させるためのフラグ
let f_wakelock = true;  //初回スタート時にWake Lockアクティブにする。
let f_sound = true;	//クリックサウンドON/OFFフラグ
let f_mousedown = false;   //マウススイッチON
let f_mouseup = false;  //マウススイッチUP
let f_raf_countdown = false;

//タイムスタンプ
let baseTimeStamp;	//[msec]単位
let currentClickTimeStamp;
let nextClickTimeStamp;

//メトロノームの基本パラメータ
let MM;	//設定されたメトロノームの表示テンポ
let Beat;	//設定された拍子
const minMM = 10;	//最小テンポ
const maxMM = 210;	//最大テンポ
const maxBeat = 6;	//拍子最大値
const MM0 = 96;	//デフォルト値
const Beat0 = 4;	//デフォルト値
let aryMM = new Array(10, 20, 30, 35, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 76, 80, 84, 88, 92, 96, 100, 104, 108, 112, 116, 120, 126, 132, 138, 144, 152, 160, 168, 176, 184, 192, 200, 208);
//テンポ設定用
let aryMM_idx = 0;
//2.3から追加機能
let start_wait = 0;  //[msec]

//分割音、分割振り関連
let ndivSound = 1;	//サウンドの分割数（1～４）設定パネルで変更
let ndivBeat = 3;	//分割振り（1～３）設定パネルで変更
let divBeat_idx =0;	//一拍内の分割振りインデクス
let  bpm;   //拍分割を加味した実際のビート速度

let beatTick = bpm2beatTick(MM);	//周期[msec]

function bpm2beatTick(mm){
	return 60 * 1000 / mm;
};

//タッピングテンポ設定関連
let tp0 = performance.now();
let tap_av_n = 3;    //タッピング移動平均の個数（3～4）
let arrTap = new Array(tap_av_n);
let seq_count = 0;    //タッピングで有効と判定された連続回数
let sum0 = 0;    //移動平均の回数に満たないときに平均を求めるための合計値
let sum = 0;    //移動平均算出用合計値

//レイアウト関連（動指標動作範囲など）
let maxH;	//指標打ち上げ最高点のmax
let xx0;	//1拍目のx座標
let xpitch;	//拍点のx座標間隔
let xxU, xxD;	//跳ね上げ点と着地点のx座標
let Beat_idx = 0; //拍位置のインデクス
let topMargin = 100;	//最高点の上余白
const divHrate = 0.7   //分割振りの高さ比率

//クリックサウンド関連（Beat Sound）
let ary_sdelay = new Array(160, 120, 80, 0, -50, -100, -200);  //タイミング調整用
let sdelay_idx = 3;
let sdelay = 0;		//サウンドタイミング調整用[msec]
const context = new AudioContext();
const osc = context.createOscillator();
const gain = context.createGain();
// 1200Hz: 敢えてドレミの音階から外れた周波数（参考サイトより）
osc.frequency.value = 1200;
// 最初は音を消しておく
gain.gain.value = 0;
//接続: osc => gain => dest.
osc.connect(gain).connect(context.destination);
//実際のオシレータ開始osc.startは、画面タップStart時1回のみ。
//発音はgainでコントロールするため、ブラウザを閉じるまで発振し続ける。

//ユーザーエージェントから、スマホかPCかの判別→PCで誤判別のため使用せず
//イベントリスナーでのclick、touchstartの切り替えに使う
//https://www.sejuku.net/blog/51336
var isPC = false;
var ua = navigator.userAgent;
var iphone = ua.indexOf('iPhone') > 0;
var androidSp = ua.indexOf('Android') > 0 && ua.indexOf('Mobile') > 0;
var ipad = ua.indexOf('iPad');
var androidT = ua.indexOf('Android');
if( iphone || androidSp || ipad || androidT){
	isPC = true;　　　　//誤判定のため強制的にＰCにする。
	console.log('PCではありません。');
}else{
	isPC = true;
	console.log('PCです。');
}

//---DOM関連------------------
	canvas = document.getElementById("myCanvas");
	ctx = canvas.getContext("2d");

    beat_canvas = document.getElementById("beatCanvas");       //拍子表示キャンバス（画面下部）
    beat_context = beat_canvas.getContext("2d");
//背景色設定
canvas.style.color = mc_bgcol;
beat_canvas.style.color = beat_bgcol;
    let beat_canvasWidth = beat_canvas.width;
    let beat_canvasHeight = beat_canvas.height;
	//設定パネルを非表示に
	document.getElementById('setting').style.display = 'none';

	//リストボックスのdivは非表示に
	document.getElementById('divTempoList').style.display = 'none'

	//動指標のオブジェクトを作る
	ball = {
	  x: 100,	  y: 100,
	  vx:17,
	  vy: 23,
	  radius: 20,
	  color: ball_col,
	  draw(x,y) {
	    ctx.beginPath();
	    ctx.arc(x, y, this.radius, 0, Math.PI * 2, true);
	    ctx.closePath();
	    ctx.fillStyle = this.color;
	    ctx.fill();
	  },
	};

	//URLから取得した値に基づいてラジオボタンのチェック位置を設定する関数
	//参考：https://zenn.dev/nordpol/scraps/3a28480361fe45
	const setRadioValue = (name, value) => {
		let elems = document.querySelectorAll(`input[name="${name}"]`);
		//console.log('ラジオボタン' + name + 'の変更：' + value);
		for (let elem of elems){
			// 	console.log('ラジオボタン' + name + 'の値：' + value);
			if (elem.value == value) {
				elem.checked = true;
				//console.log('変更！');
			break;
			}
		}
	};

	
	//URLで拍子、テンポなどを指定できるようにする
	//　例：?bt=4&mm=120
	
	// URLを取得
	let url = new URL(window.location.href);
	// URLSearchParamsオブジェクトを取得
	let url_params = url.searchParams;
	//getメソッドでURLからパラメータを抽出
	var strBeat= url_params.get('bt');  //拍子（１～6）
	var strMM=url_params.get('mm');  //メトロノームテンポ(10～209)
	var strDivSound=url_params.get('ds');  //サウンド分割(1～4)
	var strDivBeat=url_params.get('db');  //分割振り(1～3)
	//以下は０も含むので注意
	var strSFlag=url_params.get('bs');  //サウンドON/OFF(0/1)
	var strBST=url_params.get('bst');  //サウンドタイミング(0～6)7段階
	
	const pattern ="[^0-9]/g";	//置き換えのパターン、数字以外は半角0に置き換える
	if(strBeat === null){Beat = Beat0}else{		//btが指定されていないときはデフォルト値
		Beat = parseInt(strBeat.replace(pattern,'0'));
	}
	if(strMM === null){MM = MM0}else{		//mmが指定されていないときはデフォルト値
		MM = parseInt(strMM.replace(pattern,'0'));
	}
	//以下は設定パネルに反映
	//分割音
	if(strDivSound === null){ndivSound = 1}else{		//ndivSoundが指定されていないときはデフォルト値
		ndivSound = parseInt(strDivSound.replace(pattern,'0'));
		if(ndivSound > 4) ndivSound = 4;
		//設定パネルのラジオボタンchckedに反映
		setRadioValue("dsradio", ndivSound);
	}
	//分割振り
	if(strDivBeat === null){ndivBeat = 1}else{		//ndivBeatmが指定されていないときはデフォルト値
		ndivBeat = parseInt(strDivBeat.replace(pattern,'0'));
		if(ndivBeat > 3)ndivBeat = 3;
		//設定パネルのラジオボタンchckedに反映
		setRadioValue("dbradio", ndivBeat);
	}
	//サウンドON/OFF
	var fl;
	if(strSFlag === null){f_sound = true}else{		//ndivSoundが指定されていないときはデフォルト値
		if(parseInt(strSFlag) == 1){f_sound = true; fl = 1;}else{f_sound = false; fl = 0;}
		//設定パネルのラジオボタンchckedに反映
		setRadioValue("radiosound", fl);
	}
	//サウンドタイミング
	if(strBST === null){fl = 3;}else{		//ndivSoundが指定されていないときはデフォルト値
		fl = parseInt(strBST);
		if(fl < 0 || fl > 6) fl = 3; //範囲外のときは、時間差０に設定
		//sdelay = ary_sdelay[fl] / 1000;
		sdelay = ary_sdelay[fl] ;
		sdelay_idx = fl;
		//設定パネルのラジオボタンchckedに反映
		setRadioValue("radiotiming", fl);
	}
	
	//beatTick = bpm2beatTick(bpm);
	setTempo(MM);
	//拍点座標の計算
	xpitch = canvas.width / Beat;
	xx0 = xpitch/2;

	resizeCanvas();

	//ボールの初期表示位置（アウフタクト）
	ball.draw(xx0 + (Beat - 1) * xpitch, canvas.height - ball.radius);
	
	function resizeCanvas(){
		const wrapper = document.querySelector('.wrapper');
		var w = wrapper.clientWidth;    //wrapper.widthでは値が取得できなかった
		var h = wrapper.clientHeight;
	
		const el_my = document.getElementById('myCanvas');
		el_my.setAttribute('width', w);
		el_my.setAttribute('height', 0.8 * h);  //wrapperを上下に8:2に分ける
		
		const el_beat = document.getElementById('beatCanvas');
		el_beat.setAttribute('width', w);
		el_beat.setAttribute('height', 0.2 * h);
		drawBeat();   //拍子数字を書く
	    }

	//========イベントリスナー関連================================

	//ウィンドウリサイズ後のパラメータ確定
	window.addEventListener('resize', resizeCanvas);

	//設定パネルの[Close]ボタン
	document.getElementById('btn_close_setting').addEventListener('click', function(e) {
	  document.getElementById('setting').style.display = 'none';
	});
	
	
	if(isPC){
		//PC用イベントリスナー
		//拍子エリアタッチで拍子を変更（循環）
		document.getElementById('beatCanvas').addEventListener('click', BeatChange);
		//タッピング
		document.getElementById('btnTAP').addEventListener('click', Tapping);
	}else{
		//スマホ、タブレット用イベントリスナー
		//拍子エリアタッチで拍子を変更（循環）
		document.getElementById('beatCanvas').addEventListener('touchstart', BeatChange);
		//タッピング
		document.getElementById('btnTAP').addEventListener('touchstart', Tapping);
	}

	function BeatChange() {
		if(Beat >= maxBeat){
	            Beat = 1;
	        } else {
	            Beat++;
	        }
	        drawBeat(); //拍子文字を表示
	        console.log('Beat:'+Beat);
	}

	function Tapping(){
		var i;
		var tp1 = performance.now();
		var tp10 = tp1 - tp0;
		var av;
		var mm0;

		if(tp10 < 2000){    //２秒以内に次のタップがあったとき、タッピングしているとみなす
			arrTap.push(tp10);
			arrTap.shift();
			seq_count++;    //連続している回数（初期値は0）
			
			if(seq_count < tap_av_n){
				sum0 += tp10;
				av = sum0 / seq_count;
			}else if(seq_count >= tap_av_n){    //この時点で配列が満たされているはず
				//平均値を計算
				sum = 0;
				for(i = 0; i < tap_av_n; i++){	sum += arrTap[i];}
				av = sum / tap_av_n;
			}
			mm0 = 60000 / av;
			MM = Math.round(mm0);            //整数値に直したら表示
			setTempo(MM);
			f_tempo_change = true;
		}else{
			seq_count = 0;    //１回でも間隔が開いたらリセット
			sum0 = 0;
		}
		tp0 = tp1;
	} 

	
	//----テンポUP/Downボタンをタップ/長押ししたときの処理
	const target_element_up = document.getElementById('tempoAdjup');
	long_press(target_element_up, tempoUpNormal, tempoUpLong, 500);
	
	const target_element_down = document.getElementById('tempoAdjdown');
	long_press(target_element_down, tempoDownNormal, tempoDownLong, 500);
	
	//テンポ表示部をタップ／長押ししたときの処理
	const target_tempotext = document.getElementById('tempo');
	long_press(target_tempotext, dispTempoList, dispTempoList, 500);

	//テンポリスト変更時の処理
	document.getElementById('tempoList').addEventListener('change', function(e) {
		let mm = document.getElementById('tempoList').value;
		MM = Number(mm);
		setTempo(MM);
		document.getElementById('divTempoList').style.display = 'none'
	});

	//設定画面表示
	function dispSetting(){
    	//setting画面(div要素)を表示
        document.getElementById('setting').style.display = 'block';
    }

	//●●●●---設定パネルの処理---●●●●
	
	//●サウンドON/OFF
	// name属性が "radiosound" のラジオボタンをすべて取得します
	const radioSound = document.querySelectorAll('input[name="radiosound"][type="radio"]');
	// 各ラジオボタンにイベントリスナーを設定します
	radioSound.forEach(function(radioButton) {
		radioButton.addEventListener('change', function() {
			// 選択されているラジオボタンの値を取得します
			// this.checked は、イベントが発生したラジオボタンがチェックされているかを示します
			if (this.checked) {
				if(this.value == 0){f_sound = false;}else{f_sound = true;}
				drawBeat();
			}
		});
	});

	//●サウンドタイミング調整
	// name属性が "radiotiming" のラジオボタンをすべて取得
	const radioTiming = document.querySelectorAll('input[name="radiotiming"][type="radio"]');
	// 各ラジオボタンにイベントリスナーを設定
	radioTiming.forEach(function(radioButton) {
		radioButton.addEventListener('change', function() {
			// 選択されているラジオボタンの値を取得
			// this.checked は、イベントが発生したラジオボタンがチェックされているかを示す
			if (this.checked) {
				sdelay_idx = this.value;
				sdelay = ary_sdelay[sdelay_idx];
			}
		});
	});
//
	//●サウンド分割
	// name属性が "dsradio" のラジオボタンをすべて取得します
	const dsRadio = document.querySelectorAll('input[name="dsradio"][type="radio"]');
	// 各ラジオボタンにイベントリスナーを設定します
	dsRadio.forEach(function(radioButton) {
	  radioButton.addEventListener('change', function() {
	    // 選択されているラジオボタンの値を取得します
	    // this.checked は、イベントが発生したラジオボタンがチェックされているかを示します
	    if (this.checked) {
		    ndivSound = this.value;
			drawBeat();
	    }
	  });
	});

	//●拍分割
	// name属性が "dbradio" のラジオボタンをすべて取得します
	const dbRadio = document.querySelectorAll('input[name="dbradio"][type="radio"]');
	// 各ラジオボタンにイベントリスナーを設定します
	dbRadio.forEach(function(radioButton) {
	  radioButton.addEventListener('change', function() {
	    // 選択されているラジオボタンの値を取得します
	    // this.checked は、イベントが発生したラジオボタンがチェックされているかを示します
	    if (this.checked) {
	    ndivBeat = this.value;
		console.log('ndivBeat:' + ndivBeat);
		drawBeat();
	    }
	  });
	});


	//●待ち時間
	// name属性が "waitingtime" のラジオボタンをすべて取得します
	const wtRadio = document.querySelectorAll('input[name="waitingtime"][type="radio"]');
	// 各ラジオボタンにイベントリスナーを設定します
	wtRadio.forEach(function(radioButton) {
	  radioButton.addEventListener('change', function() {
	    // 選択されているラジオボタンの値を取得します
	    // this.checked は、イベントが発生したラジオボタンがチェックされているかを示します
	    if (this.checked) {
	    start_wait = this.value;
		console.log('start_wait:' + start_wait);
	    }
	  });
	});

	//リロード禁止
	window.addEventListener("beforeunload", function (event) {
	  event.preventDefault();
	 // event.returnValue = "リロード禁止です！";
	});

	//********* キャンバススワイプでテンポを素早く設定できるようにしたい ************
	const myc = document.getElementById('myCanvas');
	var startY = null;
	var endY = null;
	var deltaY = null;
	var x0, y0, travel;  //move量
	let timer;  //長押し判別タイマー
	let longtap;
	let isClick = false;
	
	myc.addEventListener('touchstart', mcToucStart);
	myc.addEventListener('mousedown', mcMouseDown);
	function mcToucStart(event) {
		event.preventDefault();  //イベントの処理を続けるのを阻止する。

		f_mousedown = true;
		f_mouseup = false;
		startY = event.touches[0].pageY;  //[0]最初のタッチだけを検知する。
		console.log('タッチスタート　at　x=' + startY);
		x0 = event.touches[0].pageX;
		y0 = event.touches[0].pageY;
		travel = 0;
		longtap = false;
		isClick = true;
		//現在のMMに相当するaryMM_idxを求めておく
		aryMM_idx = 0;
		while (MM > aryMM[aryMM_idx]) {
			aryMM_idx++;
		}

		//console.log('MM:' + MM + ' index:' + aryMM_idx);
		console.log('aryMM.length:' + aryMM.length);
		timer = setTimeout(() => {
			if((travel < 12) && f_mousedown == true){  //600msec間の累積移動量^2が少ない場合は長押しと判定
				//600msecの間にupされていなければlongtapと判定、という意味からすると!f_mouse_upのほうが論理的にわかりやすか。
				longtap = true;
				f_mousedown = false;
				//設定パネル表示
				dispSetting();
			} 
		}, 600);
			
	}

	function mcMouseDown(event) {
		event.preventDefault();  //イベントの処理を続けるのを阻止する。
		//現在のMMに相当するaryMM_idxを求めておく
		aryMM_idx = 0;
		while (MM > aryMM[aryMM_idx]) {
			aryMM_idx++;
		}
		//console.log('MM:' + MM + ' index:' + aryMM_idx);
		//console.log('aryMM.length:' + aryMM.length);

		f_mousedown = true;
		startY = event.pageY;  
		console.log('MouseDownスタート　at　Y=' + startY);
		x0 = event.pageX;
		y0 = event.pageY;
		//長押し検出
		travel = 0;
		longtap = false;
		isClick = true;
		timer = setTimeout(() => {　　//停止はclearInterval(timer)
			//600msec間の累積移動量が小さければ長押し
			if((travel < 12) && f_mousedown == true){
				longtap = true;  //mouseupなどで使う
					//設定パネル表示
				f_mousedown = false;
				dispSetting();
			} 
		}, 600);
	}
	
	myc.addEventListener('touchmove', mcMove);
	function mcMove(event) {
		//長押し検出用に移動量積算
		travel += (x0 - event.touches[0].pageX)^2 + (y0 - event.touches[0].pageY)^2;
		if(travel > 12) clearInterval(timer);
		x0 = event.touches[0].pageX;
		y0 = event.touches[0].pageY;
		console.log('travel:' + travel);
	
		const delta0 = 20;  //上下方向に動いた距離のしきい値
		event.preventDefault();
		const yy = event.touches[0].pageY;
		//移動量がしきい値未満ならなにもしない
		deltaY = startY - yy;
		if(Math.abs(deltaY) < delta0) return;
		//ここで長押しでないことが確定、つまり移動しているのでテンポ変更とみなす
		longtap = false;
		startY = yy;
		//クリック音を出す
		const now = context.currentTime;
		gain.gain.setValueAtTime(0.6, now);
		gain.gain.linearRampToValueAtTime(0, now + 0.01);
		//aryMM_idxを増減する
		aryMM_idx += Math.sign(deltaY);
		
		if(aryMM_idx >= aryMM.length){
			aryMM_idx = aryMM.length - 1;
			console.log('aryMM_idx上限！');
		}
		if(aryMM_idx < 0) aryMM_idx = 0;
		console.log(aryMM_idx);
		//MMを設定し、表示する
		MM = aryMM[aryMM_idx];
		setTempo(MM);
		document.getElementById('tempo').textContent = MM;
		//touchendのときにクリックと判断しないようにフラグを立てる
		isClick = false;
	}

myc.addEventListener('mousemove', mcMouseMove);
	function mcMouseMove(event) {
		if(f_mousedown){　　//mousedownはあたりまえなので不要では？
			//長押し検出用に移動量積算
			travel += (x0 - event.pageX)^2 + (y0 - event.pageY)^2;
			if(travel > 12) clearInterval(timer);
			x0 = event.pageX;
			y0 = event.pageY;
			console.log('travel:' + travel);
		
			const delta0 = 20;  //上下方向に動いた距離のしきい値
			event.preventDefault();
			const yy = event.pageY;
			//移動量がしきい値以内ならなにもしない
			deltaY = startY - yy;
			if(Math.abs(deltaY) < delta0) return;
			longtap = false;
			//console.log('動いた！' + deltaY);
			startY = yy;
			//クリック音を出す
			const now = context.currentTime;
			gain.gain.setValueAtTime(1, now);
			gain.gain.linearRampToValueAtTime(0, now + 0.01);
			//aryMM_idxを増減する
			aryMM_idx += Math.sign(deltaY);
			
			if(aryMM_idx >= aryMM.length){
				aryMM_idx = aryMM.length - 1;
				console.log('aryMM_idx上限！');
			}
			if(aryMM_idx < 0) aryMM_idx = 0;
			//MMを設定し、表示する
			MM = aryMM[aryMM_idx];
			setTempo(MM);
			document.getElementById('tempo').textContent = MM;
			//touchendのときにクリックと判断しないようにフラグを立てる
			isClick = false;
		}
	}

	
	myc.addEventListener('touchend', mcMouseUp);  //処理をmcMouseUpと同じにした
	function mcTouchEnd(event) {
		//clearInterval(timer);
		//f_mousedown = false;
		
		clearInterval(timer);  //長押し判別タイマー停止
		if(f_raf_countdown){
			//カウントダウンタイマーを止める
			window.cancelAnimationFrame(raf_countdown);
			f_raf_countdown = false;
			//ボールを最終拍においてスタンバイ
			drawWaiting(0);
			f_mouseup = true;
			f_mousedown = false;
			return;
		}
		f_mouseup = true;
		f_mousedown = false;
		if(longtap){
			touch = false;
		}else{
			//clearTimeout(timer);
			if(!isClick)return;
			//クリックと判断
			if(moving){	//Stop ■ストップ操作
				moving = false;
				fstop = true;	//次の拍点で停止させる
				console.log('停止フラグ：' + fstop);
			}else{
				//ボールを最終拍においてスタンバイ
				let rate = 0;
				if(start_wait >0)rate = 100;
				drawWaiting(rate);
				ct0 = performance.now();
				//描画タイマー起動
				raf_countdown = window.requestAnimationFrame(drawCounDownChart);
				f_raf_countdown = true;
			}		
		}
	}

	myc.addEventListener('mouseup', mcMouseUp);
	function mcMouseUp(event) {
		console.log('★MouseUp！ moving:' + moving);
		clearInterval(timer);  //長押し判別タイマー停止
		if(f_raf_countdown){
			//カウントダウンタイマーを止める
			window.cancelAnimationFrame(raf_countdown);
			f_raf_countdown = false;
			//ボールを最終拍においてスタンバイ
			drawWaiting(0);
			f_mouseup = true;
			f_mousedown = false;
			return;
		}
		f_mouseup = true;
		f_mousedown = false;
		if(longtap){
			touch = false;
		}else{
			if(!isClick)return;
			//クリックと判断
			if(moving){	//Stop ■ストップ操作
				moving = false;
				fstop = true;	//次の拍点で停止させる
				console.log('停止フラグ　fstop：' + fstop);
			}else{
				console.log('停止フラグ　fstop：' + fstop);
				//ボールを最終拍においてスタンバイ
				let rate = 0;
				if(start_wait >0)rate = 1;
				drawWaiting(rate);
				ct0 = performance.now();
				//描画タイマー起動
				raf_countdown = window.requestAnimationFrame(drawCounDownChart);
				f_raf_countdown = true;
			}
		}
		
	}
//-------------DOM関連 ここまで 従来のinit()の名残----------------------

	
	// URLコピー処理（[Copy URL]がクリックされたら）
	const btnCopyURL = document.getElementById("btn_copy_url");
	btnCopyURL.addEventListener('click', () => {
		if (!navigator.clipboard) {
			//dispMsg("'Copy URL' is not available on this bowser.");
			return;
		}
		//デフォルト値の場合はＵＲＬに含めない。
		var txt = baseURL + "?mm=" + MM ;
		if(Beat != 4){txt += "&bt=" + Beat;}
		if(ndivSound > 1){txt += "&ds=" + ndivSound;}
		if(ndivBeat > 1){txt += "&db=" + ndivBeat;}
		if(sdelay_idx != 3){txt += "&bst=" + sdelay_idx;}
		if(!f_sound)txt += "&bs=0";
		navigator.clipboard.writeText(txt).then(		() => {
			dispMsg('URL successfully Copied');},() => {
			dispMsg('Copy failure');});
		});  //end of event listener btn_copy_url


	const el = document.getElementById('msgbox');
	//メッセージエリアに表示し、３秒後に消す
	function dispMsg(txt){
		//console.log(el.textContent);
		el.style.color = msg_col;
		el.textContent = txt;
		//el.style.display = 'block';
		setTimeout(() => {   //2秒後に消す
			  el.textContent ='';
		}, 3000);
	}
  


//---- 関数など --------------------------------------
/**********
■スリープ回避するため画面をロックするWake Lock
　　ユーザー操作(設定パネルでのON操作)により呼び出す

let wakelock = null;
async function enableWakeLock() {
  try {
    wakelock = await navigator.wakeLock.request('screen');  //const　外した　外で定義
    //dispMsg('Wake Lock is active!');
    return wakelock;
  } catch (err) {
	  //dispMsg('Wake Lock request failed');
  }
}
*/
/***********************************
Wake Lock関連　
参考https://github.com/mdn/dom-examples/blob/main/screen-wake-lock-api/script.js
*/

// test support
let isSupported = false;

if ('wakeLock' in navigator) {
	isSupported = true;
	dispMsg('Screen Wake Lock API supported') ;
} else {
	dispMsg('Wake lock is not supported by this browser.');
}

let requestWakeLock = null;
let wakeLock = null;

if (isSupported) {
	// create a reference for the wake lock
	
	console.log('const requestWakeLock()');
	// create an async function to request a wake lock
	requestWakeLock = async () => {
		try {
		wakeLock = await navigator.wakeLock.request('screen');
		
		dispMsg('<< Wake Lock is active.>>');
		
		// listen for our release event
		wakeLock.onrelease = function(ev) {
			console.log(ev);
		}
		wakeLock.addEventListener('release', () => {
			// if wake lock is released alter the button accordingly
			//changeUI('released');
			dispMsg('Wake Lock is released.');
		});
		
		} catch (err) {
		// if wake lock request fails - usually system related, such as battery
		//wakeButton.dataset.status = 'off';
		//wakeButton.textContent = 'Turn Wake Lock ON';
		//statusElem.textContent = `${err.name}, ${err.message}`;
			dispMsg('Wake Lock request failed.');
		}
	} // requestWakeLock()
}

const handleVisibilityChange = () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
      requestWakeLock();
    }
  }

document.addEventListener('visibilitychange', handleVisibilityChange);







/*****************
■Request Animation Frameの際に呼ばれる処理
*/
function drawMark() {
	//■描画エリアの消去（クリア）
	ctx.clearRect(0, 0, canvas.width, canvas.height);//キャンバス内全面クリア
		
	//■現時点での位置に描画
	
	//■正規化座標	
	beatTick　=　bpm2beatTick(MM * ndivBeat);
	const t = (currentTimeStamp() - currentClickTimeStamp + sdelay)/beatTick;
	const y = -4 * t * (t - 1);
	
	//console.log(x + " " + y);
	let maxH =  (canvas.height - 5*ball.radius);
	
	if(divBeat_idx > 0){maxH *= divHrate;}//分割振り対応
	bpm = MM * ndivBeat;
	if(bpm > 120){ maxH = (1-(bpm - 120)/200) * maxH;}  //テンポが早い場合の高さ制限
	//console.log('maxH：'+maxH);
	//ボールを表示
	ball.draw(xxU + t * (xxD - xxU), (canvas.height - ball.radius) - y * maxH);
	
	//■次の描画の予約（お決まりの手続き）
	raf = window.requestAnimationFrame(drawMark);

	//拍点処理
	//現在時刻が拍点タイプスタンプの手前8msecを切ったら拍点とみなす
	if(currentTimeStamp() - nextClickTimeStamp + sdelay>= -8 ){  //拍点検出
		console.log('●拍点   Beat_idx:' + Beat_idx + '  divBeat_idx:' + divBeat_idx);
		if(fstop && divBeat_idx == 0){	//ストップ操作直後の拍点
			//アニメーション停止
			window.cancelAnimationFrame(raf);
			//描画エリアの消去（クリア）
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			//指標を次の拍点に置いて停止
			ball.draw(xxD, canvas.height - ball.radius);
			
		}else{  //★本来の拍点処理ここから
			if(ndivBeat == 1){   //分割振りではない場合→拍子拍点の処理
				//if(fstop){window.cancelAnimationFrame(raf);}//停止
				//次の拍点に移動するためのパラメータ設定
				if(Beat_idx < (Beat - 1)){Beat_idx++;}else{Beat_idx = 0;}
				//console.log("■拍点" + Beat_idx);
				xxU = xxD;	//現在の着地点はそのまま次の発射点になる
				xxD = xx0 + Beat_idx * xpitch;  //次の拍点に向けて発射
				//console.log(xxU + 'to' + xxD);
				//reserveSound();   //クリックサウンドの予約
				if(f_sound) rsvSoundUntilNextBeat(nextClickTimeStamp,bpm2beatTick(MM));
			} else {
				console.log('分割振りの拍点');
				//分割振りの場合　拍子拍点か否かで分ける
				if(divBeat_idx == 0){    //拍子拍点の場合
					console.log('◎拍子拍点');
					//if(fstop){window.cancelAnimationFrame(raf);}//停止
					xxU = xxD;   //現在拍点から打ち上げ、xxDはそのまま、つまり真下に落下する運動
					if(f_sound) rsvSoundUntilNextBeat(nextClickTimeStamp,bpm2beatTick(MM));
					divBeat_idx++;
				}else{    //拍子拍点でない場合
					console.log('△拍子拍点でない');
					if(divBeat_idx < ndivBeat -1){
						xxU = xxD;   //というか何も書き換えなくて良い
						divBeat_idx++;
					}else{   //次の拍へ進める
						//次の拍点に移動するためのパラメータ設定
						if(Beat_idx < (Beat - 1)){Beat_idx++;}else{Beat_idx = 0;}
						xxU = xxD;	//現在の着地点はそのまま次の発射点になる
						xxD = xx0 + Beat_idx * xpitch;  //次の拍点に向けて発射
						divBeat_idx = 0;
					}
				}
			}
		}
		currentClickTimeStamp = nextClickTimeStamp;
		nextClickTimeStamp += bpm2beatTick(MM * ndivBeat);
	}
}    // end of  drawMark
/***********************
次の拍子拍点までのサウンドを予約
次の拍点までに分割音がある場合は分割音も予約
currentBeatTimestamp　現在の拍子拍点のタイムスタンプ[msec]
span 次の拍子拍点までの時間[msec]
*/
function  rsvSoundUntilNextBeat(currentBeatTimestamp, span) {
	//次の拍子拍点サウンドを予約	
	rsvClickSound(0,currentBeatTimestamp + span);

	//次の拍点までに分割音がある場合は分割音も予約
	if(ndivSound > 1){
		for(let i = 1; i < ndivSound; i++){
			rsvClickSound(1,currentBeatTimestamp + i * span / ndivSound);
		}
	}
}

function reserveSound() {
	//■次のサウンドの予約
	//console.log('■次のサウンドの予約beatTick = '+beatTick);
	const t0 = nextClickTimeStamp;
	// スケジュール済みクリックの時刻を更新
	currentClickTimeStamp = t0;
	//console.log("スケジュール済みクリックの時刻を更新");
	nextClickTimeStamp += beatTick;	//[msec]単位
	//console.log('nextClickTimeStamp = '+nextClickTimeStamp);

	// 変換した時刻を使ってクリックサウンドを予約
	if(f_sound){
		rsvClickSound(0,nextClickTimeStamp);
					beatTick = bpm2beatTick(MM);
console.log('MM:' + MM);
		//分割音の予約
		if(ndivSound > 1 && divBeat_idx == 0){
			for(let i = 1; i < ndivSound; i++){
				rsvClickSound(1,t0 + i * beatTick / ndivSound)
			}
		}
	}
}


/***********************
//テンポ選択リストボックスの表示
*/
function dispTempoList() {
		document.getElementById('divTempoList').style.display = 'block';
}
/*****************
//currentTime[sec]をDOMHighResTimeStamp[msec]に変換して返す
*/
function currentTimeStamp() {
  return baseTimeStamp + context.currentTime * 1000;
}

/*****************
//上記とは逆に、DOMHighResTimeStampをcurrentTime形式に変換して返す
//次のサウンドの予約に使う
*/
function timeStampToAudioContextTime(timeStamp) {
  return (timeStamp - baseTimeStamp) / 1000;
}

function drawBeat(){        //拍子エリアに数字を置く
	var topMargin = 10;     //拍数字の上余白
	beat_context.font = "bold 40pt sans-serif";
	beat_context.fillStyle = beat_col;
	xpitch = beat_canvas.width / Beat;
	xx0 = xpitch / 2;  //0.5拍目の位置
	let y0 = 45;
	beat_context.clearRect(0, 0, beat_canvas.width, beat_canvas.height);
	let x = xx0;
	//console.log("Beat:" + Beat);
	for(var i = 0; i < Beat; i++){
		var str = (i+1).toString().trim();
		if(fdebug){
			//console.debug(str + ":x=" + x);
			//beat_context.fillRect(x, y0+15, 1, 10);  //チェック用マークを置く
			//console.debug("y0="+y0);
		}
		beat_context.fillText(str, x - 0.5 * beat_context.measureText(str).width, y0); 
		x += xpitch;
	}

	//分割サウンド設定（かつサウンドOＮ）の場合は、拍数字の中間に分割を示すドットを入れる。
	//ただし最終拍の後には入れない。例：１・２・３・４　　１・・２・・３　など
	beat_context.font = "bold 22pt sans-serif";
	beat_context.fillStyle = divdot0_col;
	x = xx0;
	if(f_sound == true && ndivSound > 1){
		for(var bt = 0; bt < Beat - 1;bt++){
			for(var i = 1; i < ndivSound; i++){
				x = xx0 +  bt * xpitch+ i * xpitch/ndivSound;
				beat_context.fillText('・', x - 0.5 * beat_context.measureText('・').width, y0 - 10); 
			}
		}
	}

	//分割振りの表記　分割振りの場合は拍数字の下に縦にドット表示
　　beat_context.font = "bold 22pt sans-serif";
	beat_context.fillStyle = divdot1_col;
	x = xx0;
	console.log('ndivBeat' + ndivBeat);
	for(var bt = 0; bt < Beat; bt++){
		for(var i = 1; i < ndivBeat; i++){
			x = xx0 +  bt * xpitch;
			y = y0 + i * 12 + 9;
			beat_context.fillText('・', x - 0.5 * beat_context.measureText('・').width, y); 
		}
	}
}

//メトロノームのON/OFF
function metroStart(){  //
	if(!oscActive){	//初回タップ時のみの処理
		//オシレータ開始（この段階で音量は０）
		//ユーザ操作の後にスタートさせる必要がある
		osc.start();
		oscActive = true;
		//オシレータ開始時のタイムスタンプを基準にする
		baseTimeStamp = performance.now() - context.currentTime * 1000;
	}
	if(f_wakelock && isSupported){
		//wakelock = enableWakeLock();
		requestWakeLock();
		//console.log('enableWakeLock:' + wakelock.loked);
		dispMsg('Screen Wake Lock enabled. The screen will stay on');

		f_wakelock = false;
	}
	//現在時刻を拍点時刻にする
	currentClickTimeStamp = currentTimeStamp();

	//アニメーション起動
	//ボールを初期位置に置く
	xxU = xx0 + ( Beat - 1) * xpitch;	//跳ね上げ点
	ball.draw(xxU, canvas.height - ball.radius);
	
	if(ndivBeat > 1){  //分割振りのとき
		nextClickTimeStamp = currentClickTimeStamp + bpm2beatTick(MM) / ndivBeat;
		if(f_sound) rsvClickSound(0,currentClickTimeStamp + bpm2beatTick(MM));  //次の拍子拍点サウンドを予約
		xxD = xxU;	//分割振りでは水平移動しない
		divBeat_idx = 1;Beat_idx = Beat - 1;
		console.log('分割振りスタート:' + 'Beat_idx' + Beat_idx);
	}else{  //分割振りでないとき
		//次の拍点時刻
		nextClickTimeStamp = currentClickTimeStamp + beatTick;
		if(f_sound) rsvClickSound(0,nextClickTimeStamp);  //サウンド予約
		xxD = xx0;						//着地点　アウフタクトでは着地点は一拍め
		Beat_idx = 0;
	}

	//アニメーションタイマー起動
	raf = window.requestAnimationFrame(drawMark);
	moving = true;
	fstop = false;
}


/*******************
テンポ変更
*/
function setTempo(mm){　　//分割振り対応で、内部テンポbpmと表示テンポMMを区別すること
	bpm = mm * ndivBeat;
	beatTick = bpm2beatTick(bpm);
	document.getElementById('tempo').textContent = MM;
}

//テンポ変更＋－ボタン
function tempoUpNormal(){
   if(MM < maxMM){
		MM ++;
	}
	setTempo(MM);
	f_tempo_change = true;
}
function tempoUpLong(){
	if(MM < 185){
		MM +=5;
	}
	setTempo(MM);
	f_tempo_change = true;	
}
function tempoDownNormal(){
	if(MM >= minMM){
		MM --;
	}
	setTempo(MM);
	f_tempo_change = true;
}
function tempoDownLong(){
	if(MM >= 15){
		MM -= 5;
	}
	setTempo(MM);
	f_tempo_change = true;
}

/****************
サウンド予約
soundtype:サウンドの種類 1のとき分割音
timestamp:鳴らす時刻タイムスタンプ[msec]
*/
function rsvClickSound(soundtype, timestamp){
	let gain0 = 1;  //初期ゲイン
	let len = 0.03;  //音の減衰長さ
	//分割音（soundtypeが1のとき）のパラメータ調整
	if(soundtype == 1){gain0 = 0.5;len *= 0.5}
	const nextClickTime = timeStampToAudioContextTime(timestamp);
	console.log(nextClickTime);
	gain.gain.setValueAtTime(gain0, nextClickTime);  //sdelayはボールの座標計算で使うように変更
	gain.gain.linearRampToValueAtTime(0, nextClickTime + len);  //sdelayはボールの座標計算で使うように変更
}
/*****************
//指定したDOM要素、長押しかどうかを判別して指定した関数に振り分ける
//参考：https://mo2nabe.com/long-press/
*/
function long_press(el,nf,lf,sec){
  let longclick = false;
  let longtap = false;
  let touch = false;
  let timer;
  el.addEventListener('touchstart',()=>{
	touch = true;
	longtap = false;
	timer = setTimeout(() => {
	  longtap = true;
	  lf();
	}, sec);
  })
  el.addEventListener('touchend',()=>{
	if(!longtap){
	  clearTimeout(timer);
	  nf();
	}else{
	  touch = false;
	}
  })

  el.addEventListener('mousedown',()=>{
	if(touch) return;
	longclick = false;
	timer = setTimeout(() => {
	  longclick = true;
	  lf();
	}, sec);
  })
  el.addEventListener('click',()=>{
	if(touch){
	  touch = false;
	  return;
	}
	if(!longclick){
	  clearTimeout(timer);
	  nf();
	}
  });
}  //function long_press



/*******************
開始待機画面描画
アウフタクトにボールを置いて、rateに相当するグラフを描画
*/
function drawCounDownChart() {
	const now = performance.now();
	const time0 = now - ct0; //開始からの経過時間[msec];
	//残り時間の割合を計算
	let rate = 0;
	if(start_wait > 0) rate = (start_wait - time0) / start_wait;
	
		//console.log('描画タイマー起動中　rate:' + rate);
	//
	drawWaiting(rate);

	if(rate < 0.001){  //動作開始
		//タイマー破棄
		window.cancelAnimationFrame(raf_countdown);
		f_raf_countdown = false;
		console.log('タイマー破棄　raf_countdown:' + raf_countdown);
		
		metroStart();
	}else{
		//次の描画の予約
		raf_countdown = window.requestAnimationFrame(drawCounDownChart);
		f_raf_countdown = true;
	}
}


/*******************
開始待機画面描画
アウフタクトにボールを置いて、rate(0 - 1)に相当するグラフを描画
*/
function drawWaiting(rate) {
	//ボールを最終拍においてスタンバイ
	ctx.clearRect(0, 0, canvas.width, canvas.height);//キャンバス内全面クリア
	ball.draw(xx0 + ( Beat - 1) * xpitch, canvas.height - ball.radius);
	//パイチャート描画
	if(rate > 0.01){
		startAngle = 1.5 * Math.PI;
		const angle = rate * 2 * Math.PI;
		let radius = canvas.width / 6;
		
		if(canvas.height < canvas.width){radius =canvas.height / 6};
		ctx.beginPath();
		ctx.moveTo(canvas.width / 2, canvas.height / 2); // 円の中心キャンバスの中央
		ctx.arc(canvas.width / 2, canvas.height / 2,  radius , startAngle, startAngle - angle, true);
		ctx.fillStyle = pie_color;
		ctx.fill(); 		
	}
	
}



//--------お決まりの作法-----------------------
//htmlのscriptタグの中でdeferをつければ不要
//■DOM要素がロード完了してから初期化
//document.addEventListener('DOMContentLoaded', init);
