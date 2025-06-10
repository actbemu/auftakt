/*
【auftakt52_１.js】2025/06/06　auftakt52_0.jsを元に開発
*/
/********** 本スクリプトの目的・成果 ***************
Ｇｉｔｈｕｂに置けばURLコピーができるのかの確認
2025/06/10 10:23　URLコピーはできたが、Wake Lockはできなかった。

----以下は52_2のもの
分割音と分割振り
分割振りについては、従来のパラメータ配列を採用するか？→変拍子対応しなければ不要

定義というかまず以下のことを決める
テンポは拍点のテンポ
分割音は拍点間に入る音
分割振りのテンポは拍点のテンポ→楽譜上のテンポとは異なることに注意。
２分割振りにした場合は、分割しないときの２倍のテンポを設定する。※設定パネルで選択したときに、自動的に拍点テンポの設定に反映させる。
場合によっては画面表示のテンポは、楽譜上のテンポのままにすることも可能。
分割振りを２分割、分割音を３分割というトリッキーなことも可能。指揮の見方の練習用にもなる。

記録
2025/06/06 18:42 とりあえず、単純バージョンと区別するために、配色を変更した。
2025/06/06 19:08 分割音を出してみて、充分行けることを確認。強弱のパラメータ（ゲインと長さ）導入
2025/06/06 19:34　分割音、変数対応完了　音間隔が短くなると、ディレイ量をちょっと増やしただけで、音の予約が欠けてしまうことが判明
回避策として、拍点判別のところで 8msecの猶予にsdelayを加えてみてはどうか。
ユーザインタフェースとしては、設定可能範囲を設けて、ユーザに促す配慮が必要
2025/06/06 20:49 拍数字の中間に分割を示すドットを入れた→この観点からすると、分割音はせいぜい4分割までか

分割振り
2025/06/07  9:00　指標アニメーションの基本はできた。サウンドのコントロールが不十分。
2025/06/08  9:28 分割振り、分割音ほぼ所望の動き
2025/06/08 10:22 分割ドット表示drawBeatに実装した
2025/06/08 10:46 停止操作についても所望の動きを達成
2025/06/08 14:21 分割指定もURLで可能に
URLからのds、dbは正常に設定できるが、なぜか設定パネルから変更するとおかしくなる。
スタート直後のbpmと次の拍点後のbpmが異なっているような現象も見られる。
→やはりそうだった。bpmから計算する前にきちんとbpm=MM*ndivBeatをけいさんすればＯＫ。
2025/06/08 20:21　★所望の動きＯＫ→Facebookで暫定公開
－－
2025/06/09  9:10 設定パネルのデザイン変更、CopyURL機能追加。→ろーかるでは機能したが、
ＨＴＴＰＳ環境でないとダメみたいだ。残念。
これにともない、QRコード作成ページの改変は当面見合わせることに。

2025/06/09 22:29　画面スワイプでテンポ設定できた。
スワイプ中のクリック音。osc起動前（動指標開始まえ）だと音がならない。
同じmyCanvasのタップなので、今回作ったリスナー処理の中で、初回に限りOSC起動させれば良い。
→ところがtouchstartイベントでは条件を満たさないようだ。


課題
CopyURL機能に対応して、URLから取り出すパラメータを追加ds, db, bs, bst
  wakeLockの設定はユーザー操作の後が必須なのでURLパラメータには含めない
  beat sound timingの場合は、radioボタンの値を配列の添字にする必要がある。
  
Screen wakeLock の起動をosc.startのタイミングと同じにする。もしかしたら起動するかも。→だめだった
起動時にwakeLockが使えるのかをチェックすることが必要か。




****************************************************/
//----- グローバル変数の宣言・定義 ----------------------
let fdebug = false;
//公開URL　　CopyURLで使用
const baseURL = 'http://www1.vecceed.ne.jp/~bemu/auftakt/auftakt52_1.html';
//変数のスコープを配慮し、initの外側で宣言だけしておく
let canvas;	//動指標が動くcanvas
let ctx;	//インスタンス
let beat_canvas;
let beat_context;
let raf;	//request animation frameのインスタンス（停止するときに指定するため）
let ball;	//動指標オブジェクト
const ball_col = '#375d69';   //ボールの色
const beat_col = '#375d69';   //;拍数字の色"rgb(153,153,0)";

//各種ステータスフラグ（動作コントロール用）
let moving=false;	//動作中かどうか
let oscActive=false;	//オシレータ起動中か
let fstop = false;	//直後の拍点で停止させるためのフラグ
let f_wakelock = false;
let f_sound = true;	//クリックサウンドON/OFFフラグ
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

//クリックサウンド関連オブジェクトの初期化
//DOMにアクセスしないのでここで初期化可能
//const cLen = 0.03;		//クリック音の長さ[sec]
//const divClickArate = 0.7;  //分割音の初期ゲイン比率
//const devClickLrate = 0.6   //分割音の長さ比率
//上記は関数 rsvClickSound内に移行

//クリックサウンド関連（Beat Sound）
//let ary_sdelay = [];
let ary_sdelay = new Array(160, 120, 80, 0, -50, -100, -200);  //タイミング調整用
let sdelay_idx = 3;
let sdelay = 0;		//サウンドタイミング調整用[sec]
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

//ユーザーエージェントから、スマホかPCかの判別
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

//----- DOM関連初期化処理：DOM要素がロードされた後に呼ばれる-----
function init(){
	canvas = document.getElementById("myCanvas");
	ctx = canvas.getContext("2d");


    beat_canvas = document.getElementById("beatCanvas");       //拍子表示カンバス（画面下部）
    beat_context = beat_canvas.getContext("2d");

/*    var canvasWidth; //= canvas.width;
    var canvasHeight;	//= canvas.height;
*/
    var beat_canvasWidth = beat_canvas.width;
    var beat_canvasHeight = beat_canvas.height;
	//設定パネルを非表示に
	document.getElementById('setting').style.display = 'none';

	//テンポ選択リストボックスの内容をセット
	document.getElementById('tempoList').innerHTML = optStr;
	//リストボックスのdivは非表示に
	document.getElementById('divTempoList').style.display = 'none'

	//動指標のオブジェクトを作る
	ball = {
	  x: 100,	  y: 100,
	  vx:17,
	  vy: 23,
	  radius: 20,
	  color: "#375d69",
	  draw(x,y) {
	    ctx.beginPath();
	    ctx.arc(x, y, this.radius, 0, Math.PI * 2, true);
	    ctx.closePath();
	    ctx.fillStyle = this.color;
	    ctx.fill();
	  },
	};

	//URLから取得した値に基づいてラジオボタンのチェック位置を設定する
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
	//分割設定を追加db, ds
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
		sdelay = ary_sdelay[fl] / 1000;
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
	//put_at_Auftakt();
	ball.draw(xx0 + (Beat - 1) * xpitch, canvas.height - ball.radius);
	
	function resizeCanvas(){
		const wrapper = document.querySelector('.wrapper');
		//var div_canvas = document.getElementById('div_canvas');
	//console.log(wrapper);
		var w = wrapper.clientWidth;    //wrapper.widthでは値が取得できなかった
		var h = wrapper.clientHeight;
	//console.log(w + ', ' + h);
		var el_my = document.getElementById('myCanvas');
		el_my.setAttribute('width', w);
		el_my.setAttribute('height', 0.8 * h);
		//el_my.width = w;
		const el_beat = document.getElementById('beatCanvas');
		el_beat.setAttribute('width', w);
		el_beat.setAttribute('height', 0.2 * h);
		drawBeat();
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

		//★★動作確認のため臨時に入れたコード
		/*			osc.start();
			oscActive = true;
					baseTimeStamp = performance.now() - context.currentTime * 1000;
		*/

		if(tp10 < 2000){    //２秒以内に次のタップがあったとき、タッピングしているとみなす
			arrTap.push(tp10);
			arrTap.shift();
			seq_count++;    //連続している回数（初期値は0）
			//console.log('seq_count:' + seq_count + 'array:' + arrTap);
		   if(seq_count < tap_av_n){
				sum0 += tp10;
				av = sum0 / seq_count;
				//console.log('  ' + seq_count + ': tp10' + tp10 + 'sum:' + sum0);

			}else if(seq_count >= tap_av_n){    //この時点で配列が満たされているはず
				//平均値を計算
				sum = 0;
				for(i = 0; i < tap_av_n; i++){
					//console.log(arrTap[i]);
					sum += arrTap[i];
				}
				//console.log(sum);
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
	long_press(target_element_up, tempoUpNormal, tempoUpLong, 300);
	
	const target_element_down = document.getElementById('tempoAdjdown');
	long_press(target_element_down, tempoDownNormal, tempoDownLong, 300);
	
	//テンポ表示部をタップ／長押ししたときの処理
	const target_tempotext = document.getElementById('tempo');
	long_press(target_tempotext, dispTempoList, dispTempoList, 300);

	//テンポリスト変更時の処理
	document.getElementById('tempoList').addEventListener('change', function(e) {
		let mm = document.getElementById('tempoList').value;
		MM = Number(mm);
		setTempo(MM);
		document.getElementById('divTempoList').style.display = 'none'
	});
	
	
	//---画面タップ/長押ししたときの処理
	//タップ：メトロノームON/OFF  長押し：設定パネル表示
	/*
	const target_setting = document.getElementById('myCanvas');
	long_press(target_setting, metroStart, dispSetting, 500);
	*/

	//設定画面表示
	function dispSetting(){
    	//setting画面(div要素)を表示
        document.getElementById('setting').style.display = 'block';
    }

	//●●●●---設定パネルの処理---●●●
	//●Wake Lock機能（スリープ回避機能）のON/OFF
	/*
	// name属性が "radiosound" のラジオボタンをすべて取得します
	const radioWakeLock = document.querySelectorAll('input[name="radioWakeLock"][type="radio"]');
	// 各ラジオボタンにイベントリスナーを設定します
	radioWakeLock.forEach(function(radioButton) {
	  radioButton.addEventListener('change', function() {
	    // 選択されているラジオボタンの値を取得します
	    // this.checked は、イベントが発生したラジオボタンがチェックされているかを示します
	    if (this.checked) {
	      //const mark_delay = this.value;
	      //console.log('mark_delay: ' + mark_delay);
			if(this.value == 0){
				f_wakelock = false;
wakeLock.release().then(() => {
  wakeLock = null;
});
				
				alert('Wake Lock is released!');
			}else{
				f_wakelock = true;
    				//ラジオボタンの変化ではユーザー操作とはみなされないようだ。
				//osc.startと同様に動作開始時にフラグをチェックして起動させる
				
			}
	    }
	  });
	});
	*/
	
	//●サウンドON/OFF
	// name属性が "radiosound" のラジオボタンをすべて取得します
	const radioSound = document.querySelectorAll('input[name="radiosound"][type="radio"]');
	// 各ラジオボタンにイベントリスナーを設定します
	radioSound.forEach(function(radioButton) {
	  radioButton.addEventListener('change', function() {
	    // 選択されているラジオボタンの値を取得します
	    // this.checked は、イベントが発生したラジオボタンがチェックされているかを示します
	    if (this.checked) {
	      //const mark_delay = this.value;
	      //console.log('mark_delay: ' + mark_delay);
			if(this.value == 0){f_sound = false;}else{f_sound = true;}
			drawBeat();
	    }
	  });
	});

	//●サウンドタイミング調整
	//AI Geminiによるコード
	// name属性が "radiotiming" のラジオボタンをすべて取得します
	const radioTiming = document.querySelectorAll('input[name="radiotiming"][type="radio"]');
	// 各ラジオボタンにイベントリスナーを設定します
	radioTiming.forEach(function(radioButton) {
	  radioButton.addEventListener('change', function() {
	    // 選択されているラジオボタンの値を取得します
	    // this.checked は、イベントが発生したラジオボタンがチェックされているかを示します
	    if (this.checked) {
	      sdelay_idx = this.value;
	      //console.log('mark_delay: ' + mark_delay);
			//sdelay = mark_delay / 1000;
			sdelay = ary_sdelay[sdelay_idx] / 1000;
			console.log('sdelay:' + sdelay);
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
	let timer;
	let longtap;
	let isClick = false;
	myc.addEventListener('touchstart', mcToucStart);
	function mcToucStart(event) {
		event.preventDefault();  //イベントの処理を続けるのを阻止する。
		
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
	if(travel < 8){
		longtap = true;
			//設定パネル表示
		
		dispSetting();
	} 
	
	}, 600);
		
	}

	myc.addEventListener('touchmove', mcMove);
	function mcMove(event) {
		//長押し検出用に移動量積算
		travel += (x0 - event.touches[0].pageX)^2 + (y0 - event.touches[0].pageY)^2;
		x0 = event.touches[0].pageX;
		y0 = event.touches[0].pageY;
		console.log('travel:' + travel);
	
		const delta0 = 20;  //上下方向に動いた距離のしきい値
		event.preventDefault();
		const yy = event.touches[0].pageY;
		//移動量がしきい値以内ならなにもしない
		deltaY = startY - yy;
		if(Math.abs(deltaY) < delta0) return;
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
		console.log(aryMM_idx);
		//MMを設定し、表示する
		MM = aryMM[aryMM_idx];
		document.getElementById('tempo').textContent = MM;
		//console.log('動いた！' + aryMM_idx);
		//touchendのときにクリックと判断しないようにフラグを立てる
		isClick = false;
	}

	myc.addEventListener('touchend', mcTouchEnd);
	function mcTouchEnd(event) {
		if(longtap){
			touch = false;
		}else{
			clearTimeout(timer);
			if(!isClick)return;
			//クリックと判断
			metroStart();
		}
	}




	
	
	// URLコピー処理（[Copy URL]がクリックされたら）
	//参考：https://qiita.com/abcya/items/6a9f245057cf61f09b07
	//別サイトの情報で、どうやらhttps通信でないと使えないみたいだ。
	//htmlファイルの方でもコメントアウトしておく。
	
	const btnCopyURL = document.getElementById("btn_copy_url");
	btnCopyURL.addEventListener('click', () => {
		if (!navigator.clipboard) {
			alert("'Copy URL' is not available on this bowser.");
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
			alert('URL successfully Copied');},() => {
			alert('Copy failure');});
		});  //end of event listener btn_copy_url
		
//
}　　//end of init

//---- 関数など --------------------------------------
/*****************
■スリープ回避するため画面をロックするWake Lock
　　ユーザー操作(設定パネルでのON操作)により呼び出す
*/
let wakeLock = null;
async function enableWakeLock() {
  try {
    const wakeLock = await navigator.wakeLock.request('screen');
    alert('Wake Lock is active!');
    return wakeLock;
  } catch (err) {
    alert(`Wake Lock request failed: ${err.message}`);
  }
}



/*****************
■Request Animation Frameの際に呼ばれる処理
*/
function drawMark() {
	//■描画エリアの消去（クリア）
	ctx.clearRect(0, 0, canvas.width, canvas.height);//カンバス内全面クリア
	//(参考)後引効果
	//停止したときに残像もそのまま残るのでアウフタクトでは採用できない
	//ctx.fillStyle = "rgb(255 255 255 / 30%)";
	//ctx.fillRect(0, 0, canvas.width, canvas.height);

	
	//■現時点での位置に描画
	//直前の拍点のタイムスタンプtB0(currentClickTimeStamp)からの経過時間に基づいてy座標を決める。
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
	beatTick　=　bpm2beatTick(MM * ndivBeat);
	const t = (currentTimeStamp() - currentClickTimeStamp)/beatTick;
	const y = -4 * t * (t - 1);
	
	//console.log(x + " " + y);
	let maxH =  (canvas.height - 2*ball.radius);
	
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
	if(currentTimeStamp() - nextClickTimeStamp >= -8 ){  //拍点検出
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
	beat_context.font = "bold 30pt sans-serif";
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

//カンバス内長押しかどうか判別し、長押しでない場合はメトロノームのON/OFF
function metroStart(){  //■ストップ操作
	console.log('■canvasクリック！　movingフラグ：' + moving);
	if(moving){	//Stop
		moving = false;
		fstop = true;	//次の拍点で停止させる
		console.log('停止フラグ：' + fstop);
	}else{		//Start　■スタート操作
		console.log('●スタート！');
		if(!oscActive){	//初回タップ時のみの処理
			//オシレータ開始（この段階で音量は０）
			//ユーザ操作の後にスタートさせる必要がある
			osc.start();
			oscActive = true;
			//オシレータ開始時のタイムスタンプを基準にする
			baseTimeStamp = performance.now() - context.currentTime * 1000;
		}
		if(f_wakelock){
			try {
				wakeLock = await navigator.wakeLock.request("screen");
				alert("Screen Wake Lock enabled.");
			} catch (err) {
				// 起動ロックのリクエストに失敗。ふつうはバッテリーなどのシステム関連
				alert("Screen Wake Lock failed.  `${err.name}, ${err.message}`);
			}
			f_wakelock = false;
		}
		//現在時刻を拍点時刻にする
		currentClickTimeStamp = currentTimeStamp();

		//アニメーション起動
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
			if(f_sound) rsvClickSound(0,nextClickTimeStamp);
			xxD = xx0;						//着地点　アウフタクトでは着地点は一拍め
			Beat_idx = 0;
			//console.log('xx0:'+xx0);
		}

		//console.log('アウフタクト：' + xxU + 'to' + xxD);

		//アニメーションタイマー起動
		raf = window.requestAnimationFrame(drawMark);
		moving = true;
		fstop = false;
		//カンバスサイズを表示してみる
		//console.log('canvasWidth:' + canvas.width + ', canvasHeight' +  canvas.height);
	}
}

function put_at_Auftakt(){
	//アウフタクト位置に指標を置く
	ball.draw(xx0 + (Beat - 1) * xpitch, canvas.height - ball.radius);
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
	if(MM >= 25){
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
	gain.gain.setValueAtTime(gain0, nextClickTime + sdelay);
	gain.gain.linearRampToValueAtTime(0, nextClickTime + sdelay + len);
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

//テンポ選択リストボックスの内容
var optStr = '<option value="10">10</option>';
		optStr += '<option value="20">20</option>';
		optStr += '<option value="30">30</option>';
		optStr += '<option value="35">35</option>';
		optStr += '<option value="40">40</option>';
		optStr += '<option value="42">42 Grave</option>';
		optStr += '<option value="44">44</option>';
		optStr += '<option value="46">46 Largo</option>';
		optStr += '<option value="48">48</option>';
		optStr += '<option value="50">50</option>';
		optStr += '<option value="52">52 Adagio</option>';
		optStr += '<option value="54">54</option>';
		optStr += '<option value="56">56 Lento</option>';
		optStr += '<option value="58">58</option>';
		optStr += '<option value="60">60</option>';
		optStr += '<option value="63">63</option>';
		optStr += '<option value="66">66</option>';
		optStr += '<option value="69">69</option>';
		optStr += '<option value="72">72 Andante</option>';
		optStr += '<option value="76">76</option>';
		optStr += '<option value="80">80</option>';
		optStr += '<option value="84">84</option>';
		optStr += '<option value="88">88</option>';
		optStr += '<option value="92">92</option>';
		optStr += '<option value="96" selected>96 Moderato</option>';
		optStr += '<option value="100">100</option>';
		optStr += '<option value="104">104</option>';
		optStr += '<option value="108">108 Allegretto</option>';
		optStr += '<option value="112">112</option>';
		optStr += '<option value="116">116</option>';
		optStr += '<option value="120">120</option>';
		optStr += '<option value="126">126</option>';
		optStr += '<option value="132">132 Allegro</option>';
		optStr += '<option value="138">138</option>';
		optStr += '<option value="144">144</option>';
		optStr += '<option value="152">152</option>';
		optStr += '<option value="160">160 Vivace</option>';
		optStr += '<option value="168">168</option>';
		optStr += '<option value="176">176</option>';
		optStr += '<option value="184">184 Presto</option>';
		optStr += '<option value="192">192</option>';
		optStr += '<option value="200">200</option>';
		optStr += '<option value="208">208</option>';


//--------お決まりの作法-----------------------
//■DOM要素がロード完了してから初期化
document.addEventListener('DOMContentLoaded', init);
//ページ全体のロードが終わってから初期化
//window.addEventListener("load", init);
