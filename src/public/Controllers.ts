import { WebSocketClientService } from "./WebSocketClientService";
import { entitiesCtrl, api, userdata, entityCtrl } from "./CommonControllers";
import { NoderedUtil, Ace, Base, TokenUser } from "openflow-api";
function treatAsUTC(date): number {
    var result = new Date(date);
    result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
    return result as any;
}
function daysBetween(startDate, endDate): number {
    var millisecondsPerDay = 24 * 60 * 60 * 1000;
    return (treatAsUTC(endDate) - treatAsUTC(startDate)) / millisecondsPerDay;
}
export class chartset {
    options: any = {
        legend: { display: true }
    };
    // baseColors: string[] = ['#F7464A', '#97BBCD', '#FDB45C', '#46BFBD', '#949FB1', '#4D5360'];
    // baseColors: string[] = ['#803690', '#00ADF9', '#DCDCDC', '#46BFBD', '#FDB45C', '#949FB1', '#4D5360'];
    baseColors: [
        '#97BBCD', // blue
        '#DCDCDC', // light grey
        '#F7464A', // red
        '#46BFBD', // green
        '#FDB45C', // yellow
        '#949FB1', // grey
        '#4D5360'  // dark grey
    ];
    colors: string[] = this.baseColors;
    type: string = 'bar';
    heading: string = "";
    labels: string[] = [];
    series: string[] = [];
    data: any[] = [];
    ids: any[] = [];
    charttype: string = "bar";
    click: any = null;
}
export class MainCtrl extends entitiesCtrl<Base> {
    public showcompleted: boolean = false;
    constructor(
        public $scope: ng.IScope,
        public $location: ng.ILocationService,
        public $routeParams: ng.route.IRouteParamsService,
        public $interval: ng.IIntervalService,
        public WebSocketClientService: WebSocketClientService,
        public api: api,
        public userdata: userdata
    ) {
        super($scope, $location, $routeParams, $interval, WebSocketClientService, api, userdata);
        console.debug("MainCtrl");
        // this.collection = "workflow_instances"
        this.collection = "entities";
        WebSocketClientService.onSignedin((_user: TokenUser) => {
            this.loadData();
        });

    }
}
export class LoginCtrl {
    public static $inject = [
        "$scope",
        "$location",
        "$routeParams",
        "WebSocketClientService",
        "api"
    ];
    constructor(
        public $scope: ng.IScope,
        public $location: ng.ILocationService,
        public $routeParams: ng.route.IRouteParamsService,
        public WebSocketClientService: WebSocketClientService,
        public api: api
    ) {
        console.debug("LoginCtrl::constructor");
        var url: string = window.location.href;
        var arr: string[] = url.split("/");
        var result2: string = arr[0] + "//" + arr[2];
        top.location.href = result2 + "/saml";
    }

}
export class MenuCtrl {
    public user: TokenUser;
    public signedin: boolean = false;
    public path: string = "";
    public static $inject = [
        "$scope",
        "$location",
        "$routeParams",
        "WebSocketClientService",
        "api"
    ];
    constructor(
        public $scope: ng.IScope,
        public $location: ng.ILocationService,
        public $routeParams: ng.route.IRouteParamsService,
        public WebSocketClientService: WebSocketClientService,
        public api: api
    ) {
        console.debug("MenuCtrl::constructor");
        $scope.$root.$on('$routeChangeStart', (...args) => { this.routeChangeStart.apply(this, args); });
        this.path = this.$location.path();
        var cleanup = this.$scope.$on('signin', (event, data) => {
            if (event && data) { }
            this.user = data;
            this.signedin = true;
            if (!this.$scope.$$phase) { this.$scope.$apply(); }
            // cleanup();
        });
    }
    routeChangeStart(event: any, next: any, current: any) {
        this.path = this.$location.path();
    }
    hasrole(role: string) {
        if (this.WebSocketClientService.user === null || this.WebSocketClientService.user === undefined) return false;
        var hits = this.WebSocketClientService.user.roles.filter(member => member.name == role);
        return (hits.length == 1)
    }
    hascordova() {
        return this.WebSocketClientService.usingCordova;
    }
    stopimpersonation() {
        this.WebSocketClientService.loadToken();
    }
    PathIs(path: string) {
        if (this.path == null && this.path == undefined) return false;
        return this.path.startsWith(path);
    }
}
export class EntityCtrl extends entityCtrl<Base> {
    searchFilteredList: TokenUser[] = [];
    searchSelectedItem: TokenUser = null;
    searchtext: string = "";
    e: any = null;

    public newkey: string = "";
    public showjson: boolean = false;
    public jsonmodel: string = "";
    public message: string = "";
    constructor(
        public $scope: ng.IScope,
        public $location: ng.ILocationService,
        public $routeParams: ng.route.IRouteParamsService,
        public $interval: ng.IIntervalService,
        public WebSocketClientService: WebSocketClientService,
        public api: api
    ) {
        super($scope, $location, $routeParams, $interval, WebSocketClientService, api);
        console.debug("EntityCtrl");
        this.collection = $routeParams.collection;
        this.postloadData = this.processdata;
        WebSocketClientService.onSignedin(async (user: TokenUser) => {
            // this.usergroups = await this.api.Query("users", {});
            if (this.id !== null && this.id !== undefined) {
                await this.loadData();
            } else {
                this.model = new Base();
                this.model._type = "test";
                this.model.name = "new item";
                this.model._encrypt = [];
                this.model._acl = [];
                this.keys = Object.keys(this.model);
                for (var i: number = this.keys.length - 1; i >= 0; i--) {
                    if (this.keys[i].startsWith('_')) this.keys.splice(i, 1);
                }
                this.processdata();
                //if (!this.$scope.$$phase) { this.$scope.$apply(); }
            }
        });
    }
    processdata() {
        var ids: string[] = [];
        if (this.collection == "files") {
            for (var i: number = 0; i < (this.model as any).metadata._acl.length; i++) {
                ids.push((this.model as any).metadata._acl[i]._id);
            }
        } else {
            for (var i: number = 0; i < this.model._acl.length; i++) {
                ids.push(this.model._acl[i]._id);
            }
        }
        if (!this.$scope.$$phase) { this.$scope.$apply(); }
        this.fixtextarea();
    }
    fixtextarea() {
        setTimeout(() => {
            var tx = document.getElementsByTagName('textarea');
            for (var i = 0; i < tx.length; i++) {
                tx[i].setAttribute('style', 'height:' + (tx[i].scrollHeight) + 'px;overflow-y:hidden;');
                tx[i].addEventListener("input", OnInput, false);
            }

            function OnInput() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            }

        }, 500);
    }
    togglejson() {
        this.showjson = !this.showjson;
        if (this.showjson) {
            this.jsonmodel = JSON.stringify(this.model, null, 2);
        } else {
            this.model = JSON.parse(this.jsonmodel);
            this.keys = Object.keys(this.model);
            for (var i: number = this.keys.length - 1; i >= 0; i--) {
                if (this.keys[i].startsWith('_')) this.keys.splice(i, 1);
            }
        }
        if (!this.$scope.$$phase) { this.$scope.$apply(); }
        this.fixtextarea();
    }
    async submit(): Promise<void> {
        if (this.showjson) {
            try {
                this.model = JSON.parse(this.jsonmodel);
            } catch (error) {
                this.message = error;
                if (!this.$scope.$$phase) { this.$scope.$apply(); }
                return;
            }
        }
        try {
            if (this.model._id) {
                await NoderedUtil.UpdateOne(this.collection, null, this.model, 1, false, null);
            } else {
                await NoderedUtil.InsertOne(this.collection, this.model, 1, false, null);
            }
        } catch (error) {
            this.errormessage = error;
            if (!this.$scope.$$phase) { this.$scope.$apply(); }
            return;
        }
        if (this.collection == "files") {
            this.$location.path("/Files");
            if (!this.$scope.$$phase) { this.$scope.$apply(); }
            return;
        }
        this.$location.path("/Entities/" + this.collection);
        if (!this.$scope.$$phase) { this.$scope.$apply(); }
    }
    removekey(key) {
        if (this.keys.indexOf(key) > -1) {
            this.keys.splice(this.keys.indexOf(key), 1);
        }
        delete this.model[key];
    }
    addkey() {
        if (this.newkey === '') { return; }
        if (this.keys.indexOf(this.newkey) > -1) {
            this.keys.splice(this.keys.indexOf(this.newkey), 1);
        }
        this.keys.push(this.newkey);
        this.model[this.newkey] = '';
        this.newkey = '';
    }
    removeuser(_id) {
        if (this.collection == "files") {
            for (var i = 0; i < (this.model as any).metadata._acl.length; i++) {
                if ((this.model as any).metadata._acl[i]._id == _id) {
                    (this.model as any).metadata._acl.splice(i, 1);
                }
            }
        } else {
            for (var i = 0; i < this.model._acl.length; i++) {
                if (this.model._acl[i]._id == _id) {
                    this.model._acl.splice(i, 1);
                    //this.model._acl = this.model._acl.splice(index, 1);
                }
            }
        }

    }
    adduser() {
        var ace = new Ace();
        ace.deny = false;
        ace._id = this.searchSelectedItem._id;
        ace.name = this.searchSelectedItem.name;
        ace.rights = "//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8=";

        if (this.collection == "files") {
            (this.model as any).metadata._acl.push(ace);
        } else {
            this.model._acl.push(ace);
        }
        this.searchSelectedItem = null;
        this.searchtext = "";
    }

    isBitSet(base64: string, bit: number): boolean {
        bit--;
        var buf = this._base64ToArrayBuffer(base64);
        var view = new Uint8Array(buf);
        var octet = Math.floor(bit / 8);
        var currentValue = view[octet];
        var _bit = (bit % 8);
        var mask = Math.pow(2, _bit);
        return (currentValue & mask) != 0;
    }
    setBit(base64: string, bit: number) {
        bit--;
        var buf = this._base64ToArrayBuffer(base64);
        var view = new Uint8Array(buf);
        var octet = Math.floor(bit / 8);
        var currentValue = view[octet];
        var _bit = (bit % 8);
        var mask = Math.pow(2, _bit);
        var newValue = currentValue | mask;
        view[octet] = newValue;
        return this._arrayBufferToBase64(view);
    }
    unsetBit(base64: string, bit: number) {
        bit--;
        var buf = this._base64ToArrayBuffer(base64);
        var view = new Uint8Array(buf);
        var octet = Math.floor(bit / 8);
        var currentValue = view[octet];
        var _bit = (bit % 8);
        var mask = Math.pow(2, _bit);
        var newValue = currentValue &= ~mask;
        view[octet] = newValue;
        return this._arrayBufferToBase64(view);
    }
    toogleBit(a: any, bit: number) {
        if (this.isBitSet(a.rights, bit)) {
            a.rights = this.unsetBit(a.rights, bit);
        } else {
            a.rights = this.setBit(a.rights, bit);
        }
        var buf2 = this._base64ToArrayBuffer(a.rights);
        var view2 = new Uint8Array(buf2);
    }
    _base64ToArrayBuffer(string_base64): ArrayBuffer {
        var binary_string = window.atob(string_base64);
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            //var ascii = string_base64.charCodeAt(i);
            var ascii = binary_string.charCodeAt(i);
            bytes[i] = ascii;
        }
        return bytes.buffer;
    }
    _arrayBufferToBase64(array_buffer): string {
        var binary = '';
        var bytes = new Uint8Array(array_buffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i])
        }
        return window.btoa(binary);
    }




    restrictInput(e) {
        if (e.keyCode == 13) {
            e.preventDefault();
            return false;
        }
    }
    setkey(e) {
        this.e = e;
        this.handlekeys();
    }
    handlekeys() {
        if (this.searchFilteredList.length > 0) {
            var idx: number = -1;
            for (var i = 0; i < this.searchFilteredList.length; i++) {
                if (this.searchSelectedItem != null) {
                    if (this.searchFilteredList[i]._id == this.searchSelectedItem._id) {
                        idx = i;
                    }
                }
            }
            if (this.e.keyCode == 38) { // up
                if (idx <= 0) {
                    idx = 0;
                } else { idx--; }
                console.debug("idx: " + idx);
                // this.searchtext = this.searchFilteredList[idx].name;
                this.searchSelectedItem = this.searchFilteredList[idx];
                return;
            }
            else if (this.e.keyCode == 40) { // down
                if (idx >= this.searchFilteredList.length) {
                    idx = this.searchFilteredList.length - 1;
                } else { idx++; }
                console.debug("idx: " + idx);
                // this.searchtext = this.searchFilteredList[idx].name;
                this.searchSelectedItem = this.searchFilteredList[idx];
                return;
            }
            else if (this.e.keyCode == 13) { // enter
                if (idx >= 0) {
                    this.searchtext = this.searchFilteredList[idx].name;
                    this.searchSelectedItem = this.searchFilteredList[idx];
                    this.searchFilteredList = [];
                    if (!this.$scope.$$phase) { this.$scope.$apply(); }
                }
                return;
            }
            else {
                // console.debug(this.e.keyCode);
            }
        } else {
            if (this.e.keyCode == 13 && this.searchSelectedItem != null) {
                this.adduser();
            }
        }
    }
    async handlefilter(e) {
        this.e = e;
        // console.debug(e.keyCode);
        var ids: string[];
        if (this.collection == "files") {
            ids = (this.model as any).metadata._acl.map(item => item._id);
        } else {
            ids = this.model._acl.map(item => item._id);
        }
        this.searchFilteredList = await NoderedUtil.Query("users",
            {
                $and: [
                    { $or: [{ _type: "user" }, { _type: "role" }] },
                    { name: new RegExp([this.searchtext].join(""), "i") },
                    { _id: { $nin: ids } }
                ]
            }
            , null, { _type: -1, name: 1 }, 5, 0, null);
        if (!this.$scope.$$phase) { this.$scope.$apply(); }
    }
    fillTextbox(searchtext) {
        this.searchFilteredList.forEach((item: any) => {
            if (item.name.toLowerCase() == searchtext.toLowerCase()) {
                this.searchtext = item.name;
                this.searchSelectedItem = item;
                this.searchFilteredList = [];
                if (!this.$scope.$$phase) { this.$scope.$apply(); }
            }
        });
    }

}
export class EntitiesCtrl extends entitiesCtrl<Base> {
    public collections: any;
    constructor(
        public $scope: ng.IScope,
        public $location: ng.ILocationService,
        public $routeParams: ng.route.IRouteParamsService,
        public $interval: ng.IIntervalService,
        public WebSocketClientService: WebSocketClientService,
        public api: api,
        public userdata: userdata
    ) {
        super($scope, $location, $routeParams, $interval, WebSocketClientService, api, userdata);
        console.debug("EntitiesCtrl");
        this.autorefresh = true;
        this.basequery = {};
        this.collection = $routeParams.collection;
        this.baseprojection = { _type: 1, type: 1, name: 1, _created: 1, _createdby: 1, _modified: 1 };
        this.postloadData = this.processdata;
        if (this.userdata.data.EntitiesCtrl) {
            this.basequery = this.userdata.data.EntitiesCtrl.basequery;
            this.collection = this.userdata.data.EntitiesCtrl.collection;
            this.baseprojection = this.userdata.data.EntitiesCtrl.baseprojection;
            this.orderby = this.userdata.data.EntitiesCtrl.orderby;
            this.searchstring = this.userdata.data.EntitiesCtrl.searchstring;
            this.basequeryas = this.userdata.data.EntitiesCtrl.basequeryas;
        } else {
            if (NoderedUtil.IsNullEmpty(this.collection)) {
                this.$location.path("/Entities/entities");
                if (!this.$scope.$$phase) { this.$scope.$apply(); }
                return;
            }
        }
        if (NoderedUtil.IsNullEmpty(this.collection)) {
            this.$location.path("/Entities/entities");
            if (!this.$scope.$$phase) { this.$scope.$apply(); }
            return;
        } else if (this.$location.path() != "/Entities/" + this.collection) {
            this.$location.path("/Entities/" + this.collection);
            if (!this.$scope.$$phase) { this.$scope.$apply(); }
            return;
        }
        if (!this.$scope.$$phase) { this.$scope.$apply(); }
        WebSocketClientService.onSignedin(async (user: TokenUser) => {
            this.collections = await NoderedUtil.ListCollections(null);
            this.loadData();
        });
    }
    processdata() {
        if (!this.userdata.data.EntitiesCtrl) this.userdata.data.EntitiesCtrl = {};
        this.userdata.data.EntitiesCtrl.basequery = this.basequery;
        this.userdata.data.EntitiesCtrl.collection = this.collection;
        this.userdata.data.EntitiesCtrl.baseprojection = this.baseprojection;
        this.userdata.data.EntitiesCtrl.orderby = this.orderby;
        this.userdata.data.EntitiesCtrl.searchstring = this.searchstring;
        this.userdata.data.EntitiesCtrl.basequeryas = this.basequeryas;
        if (!this.$scope.$$phase) { this.$scope.$apply(); }
    }
    SelectCollection() {
        this.userdata.data.EntitiesCtrl.collection = this.collection;
        this.$location.path("/Entities/" + this.collection);
        //this.$location.hash("#/Entities/" + this.collection);
        if (!this.$scope.$$phase) { this.$scope.$apply(); }
        // this.loadData();
    }
    async DropCollection() {
        await NoderedUtil.DropCollection(this.collection, null);
        this.collections = await NoderedUtil.ListCollections(null);
        this.collection = "entities";
        this.loadData();
    }
    async DeleteOne(model: any): Promise<any> {
        this.loading = true;
        try {
            await NoderedUtil.DeleteOne(this.collection, model._id, null);
            this.models = this.models.filter(function (m: any): boolean { return m._id !== model._id; });
        } catch (error) {
            this.errormessage = error;
        }
        this.loading = false;
        if (!this.$scope.$$phase) { this.$scope.$apply(); }
    }
}
declare var jsondiffpatch: any;
export class HistoryCtrl extends entitiesCtrl<Base> {
    public id: string = "";
    public model: Base;
    constructor(
        public $scope: ng.IScope,
        public $location: ng.ILocationService,
        public $routeParams: ng.route.IRouteParamsService,
        public $interval: ng.IIntervalService,
        public WebSocketClientService: WebSocketClientService,
        public api: api,
        public userdata: userdata
    ) {
        super($scope, $location, $routeParams, $interval, WebSocketClientService, api, userdata);
        this.autorefresh = true;
        console.debug("HistoryCtrl");
        this.id = $routeParams.id;
        this.basequery = { _id: this.id };
        this.collection = $routeParams.collection;
        this.baseprojection = null;
        this.postloadData = this.ProcessData;
        WebSocketClientService.onSignedin((user: TokenUser) => {
            this.loadData();
        });
    }
    async ProcessData() {
        this.model = this.models[0];
        var keys = Object.keys(this.model);
        keys.forEach(key => {
            if (key.startsWith("_")) {
                delete this.model[key];
            }
        });
        this.models = await NoderedUtil.Query(this.collection + "_hist", { id: this.id }, { name: 1, _createdby: 1, _modified: 1, _version: 1 }, this.orderby, 100, 0, null);
        if (!this.$scope.$$phase) { this.$scope.$apply(); }
    }
    async CompareNow(model) {
        var modal: any = $("#exampleModal");
        modal.modal()
        // var delta = jsondiffpatch.diff(this.model, model.item);
        if (model.item == null) {
            var items = await NoderedUtil.Query(this.collection + "_hist", { _id: model._id }, null, this.orderby, 100, 0, null);
            if (items.length > 0) {
                model.item = items[0].item;
                model.delta = items[0].delta;
            }
        }
        var keys = Object.keys(model.item);
        keys.forEach(key => {
            if (key.startsWith("_")) {
                delete model.item[key];
            }
        });

        var delta = jsondiffpatch.diff(model.item, this.model);
        document.getElementById('visual').innerHTML = jsondiffpatch.formatters.html.format(delta, this.model);
    }
    async CompareThen(model) {
        if (model.item == null || model.delta == null) {
            var items = await NoderedUtil.Query(this.collection + "_hist", { _id: model._id }, null, this.orderby, 100, 0, null);
            if (items.length > 0) {
                model.item = items[0].item;
                model.delta = items[0].delta;
            }
        }
        var modal: any = $("#exampleModal");
        modal.modal();
        document.getElementById('visual').innerHTML = jsondiffpatch.formatters.html.format(model.delta, model.item);
    }
    async RevertTo(model) {
        if (model.item == null) {
            var items = await NoderedUtil.Query(this.collection + "_hist", { _id: model._id }, null, this.orderby, 100, 0, null);
            if (items.length > 0) {
                model.item = items[0].item;
                model.delta = items[0].delta;
            }
        }
        let result = window.confirm("Overwrite current version with version " + model._version + "?");
        if (result) {
            jsondiffpatch.patch(model.item, model.delta);
            model.item._id = this.id;
            await NoderedUtil.UpdateOne(this.collection, null, model.item, 1, false, null);
            this.loadData();
        }
    }
}
